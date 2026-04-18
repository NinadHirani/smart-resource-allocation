const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

function createToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, org_id: user.org_id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function generateOrgCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function createUniqueOrgCode(client) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const orgCode = generateOrgCode();
    const exists = await client.query('SELECT 1 FROM organizations WHERE org_code = $1', [orgCode]);
    if (exists.rowCount === 0) return orgCode;
  }
  throw new Error('Unable to generate unique organization code');
}

router.post('/register/admin', async (req, res) => {
  const { org_name: orgName, email, password } = req.body;

  if (!orgName || !email || !password) {
    return res.status(400).json({ error: 'org_name, email and password are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email already in use' });
    }

    const orgCode = await createUniqueOrgCode(client);
    const orgResult = await client.query(
      'INSERT INTO organizations(name, org_code) VALUES($1, $2) RETURNING *',
      [orgName, orgCode]
    );

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userResult = await client.query(
      'INSERT INTO users(org_id, email, password_hash, role) VALUES($1, $2, $3, $4) RETURNING id, org_id, email, role, created_at',
      [orgResult.rows[0].id, email, passwordHash, 'admin']
    );

    await client.query('COMMIT');

    const user = userResult.rows[0];
    const token = createToken(user);

    return res.status(201).json({ token, user, org: orgResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.post('/register/volunteer', async (req, res) => {
  const { email, password, name, phone } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password and name are required' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const userResult = await pool.query(
      'INSERT INTO users(org_id, email, password_hash, role) VALUES(NULL, $1, $2, $3) RETURNING id, org_id, email, role, created_at',
      [email, passwordHash, 'volunteer']
    );

    await pool.query(
      'INSERT INTO volunteer_profiles(user_id, display_name, phone) VALUES($1, $2, $3)',
      [userResult.rows[0].id, name, phone || null]
    );

    const user = userResult.rows[0];
    const token = createToken(user);

    return res.status(201).json({ token, user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        org_id: user.org_id,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.role,
         u.org_id,
         u.created_at,
         o.name AS org_name,
         o.org_code
       FROM users u
       LEFT JOIN organizations o ON o.id = u.org_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
