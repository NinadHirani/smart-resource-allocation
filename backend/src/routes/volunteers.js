const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { toArrayFilter } = require('../utils');

const router = express.Router();

router.get('/profile', auth, requireRole('volunteer'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM volunteer_profiles WHERE user_id = $1', [req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.json({ profile: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/profile', auth, requireRole('volunteer'), async (req, res) => {
  const {
    display_name: displayName,
    phone,
    skills = [],
    availability = [],
    location_preference: locationPreference,
    bio,
    is_available: isAvailable,
  } = req.body;

  if (!displayName) {
    return res.status(400).json({ error: 'display_name is required' });
  }

  try {
    const result = await pool.query(
      `UPDATE volunteer_profiles
       SET display_name = $1,
           phone = $2,
           skills = $3,
           availability = $4,
           location_preference = $5,
           bio = $6,
           is_available = $7,
           updated_at = NOW()
       WHERE user_id = $8
       RETURNING *`,
      [
        displayName,
        phone || null,
        skills,
        availability,
        locationPreference || null,
        bio || null,
        typeof isAvailable === 'boolean' ? isAvailable : true,
        req.user.id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.json({ profile: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/my-tasks', auth, requireRole('volunteer'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         vta.id AS assignment_id,
         vta.status AS assignment_status,
         vta.assigned_at,
         vta.completed_at AS assignment_completed_at,
         t.*
       FROM volunteer_task_assignments vta
       JOIN tasks t ON t.id = vta.task_id
       WHERE vta.volunteer_id = $1
       ORDER BY vta.assigned_at DESC`,
      [req.user.id]
    );

    return res.json({ tasks: result.rows });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/assignments/:assignment_id/complete', auth, requireRole('volunteer'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const assignment = await client.query(
      `UPDATE volunteer_task_assignments
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND volunteer_id = $2
       RETURNING *`,
      [req.params.assignment_id, req.user.id]
    );

    if (assignment.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const taskId = assignment.rows[0].task_id;

    const stats = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM volunteer_task_assignments
       WHERE task_id = $1`,
      [taskId]
    );

    const task = await client.query('SELECT volunteer_count_needed FROM tasks WHERE id = $1', [taskId]);
    const needed = task.rows[0]?.volunteer_count_needed || 1;

    const completedCount = stats.rows[0].completed;
    const acceptedCount = stats.rows[0].accepted;

    if (completedCount >= needed) {
      await client.query("UPDATE tasks SET status = 'completed', completed_at = NOW() WHERE id = $1", [taskId]);
    } else if (acceptedCount > 0) {
      await client.query("UPDATE tasks SET status = 'in_progress' WHERE id = $1", [taskId]);
    }

    await client.query('COMMIT');
    return res.json({ assignment: assignment.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.get('/', auth, requireRole('admin'), async (req, res) => {
  const { is_available: isAvailable, skills } = req.query;

  const params = [];
  const where = [];

  if (typeof isAvailable !== 'undefined') {
    params.push(isAvailable === 'true');
    where.push(`vp.is_available = $${params.length}`);
  }

  const skillFilters = toArrayFilter(skills);
  if (skillFilters.length > 0) {
    params.push(skillFilters);
    where.push(`vp.skills && $${params.length}::text[]`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT
         u.id AS user_id,
         u.email,
         vp.display_name,
         vp.phone,
         vp.skills,
         vp.availability,
         vp.location_preference,
         vp.bio,
         vp.is_available,
         vp.updated_at
       FROM users u
       JOIN volunteer_profiles vp ON vp.user_id = u.id
       ${whereSql}
       ORDER BY vp.updated_at DESC`,
      params
    );

    return res.json({ volunteers: result.rows });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
