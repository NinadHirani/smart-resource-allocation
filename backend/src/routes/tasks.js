const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { NEED_CATEGORIES, TASK_STATUSES } = require('../constants');
const { clampNumber, toArrayFilter } = require('../utils');

const router = express.Router();

router.post('/', auth, requireRole('admin'), async (req, res) => {
  const {
    need_report_id: needReportId,
    title,
    description,
    location,
    category,
    required_skills: requiredSkills = [],
    volunteer_count_needed: volunteerCountNeeded = 1,
    deadline,
  } = req.body;

  if (!title || !description || !location || !category) {
    return res.status(400).json({ error: 'Missing required task fields' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const taskResult = await client.query(
      `INSERT INTO tasks(
         org_id, need_report_id, created_by, title, description, location,
         category, required_skills, volunteer_count_needed, deadline, status
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'open')
       RETURNING *`,
      [
        req.user.org_id,
        needReportId || null,
        req.user.id,
        title,
        description,
        location,
        category,
        requiredSkills,
        volunteerCountNeeded,
        deadline || null,
      ]
    );

    if (needReportId) {
      await client.query(
        'UPDATE need_reports SET status = $1 WHERE id = $2 AND org_id = $3',
        ['task_created', needReportId, req.user.org_id]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({ task: taskResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.get('/', auth, async (req, res) => {
  const {
    status,
    category,
    from_deadline: fromDeadline,
    to_deadline: toDeadline,
    page = 1,
    limit = 20,
  } = req.query;

  let orgId = req.user.org_id;
  if (req.user.role === 'volunteer') {
    const orgLookup = await pool.query(
      `SELECT t.org_id
       FROM volunteer_task_assignments vta
       JOIN tasks t ON t.id = vta.task_id
       WHERE vta.volunteer_id = $1
       LIMIT 1`,
      [req.user.id]
    );
    orgId = orgLookup.rows[0]?.org_id || null;
  }

  if (!orgId) {
    return res.json({ data: [], total: 0 });
  }

  const params = [orgId];
  const where = ['org_id = $1'];

  const statuses = toArrayFilter(status).filter((item) => TASK_STATUSES.includes(item));
  if (statuses.length > 0) {
    params.push(statuses);
    where.push(`t.status = ANY($${params.length}::text[])`);
  }
  const categories = toArrayFilter(category).filter((item) => NEED_CATEGORIES.includes(item));
  if (categories.length > 0) {
    params.push(categories);
    where.push(`t.category = ANY($${params.length}::text[])`);
  }
  if (fromDeadline) {
    params.push(fromDeadline);
    where.push(`t.deadline >= $${params.length}`);
  }
  if (toDeadline) {
    params.push(toDeadline);
    where.push(`t.deadline <= $${params.length}`);
  }

  const currentPage = clampNumber(page, 1, 1, 1000);
  const perPage = clampNumber(limit, 20, 1, 50);
  const offset = (currentPage - 1) * perPage;

  try {
    const totalQuery = `SELECT COUNT(*)::int AS total FROM tasks t WHERE ${where.join(' AND ')}`;
    const totalResult = await pool.query(totalQuery, params);

    params.push(perPage, offset);
    const dataQuery = `
      SELECT
        t.*,
        COUNT(vta.id)::int AS volunteers_assigned
      FROM tasks t
      LEFT JOIN volunteer_task_assignments vta ON vta.task_id = t.id AND vta.status IN ('accepted', 'completed')
      WHERE ${where.join(' AND ')}
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `;

    const result = await pool.query(dataQuery, params);
    return res.json({ data: result.rows, total: totalResult.rows[0].total, page: currentPage, limit: perPage });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const task = await pool.query(
      `SELECT
         t.*,
         COUNT(vta.id) FILTER (WHERE vta.status IN ('accepted', 'completed'))::int AS volunteers_assigned
       FROM tasks t
       LEFT JOIN volunteer_task_assignments vta ON vta.task_id = t.id
       WHERE t.id = $1
       GROUP BY t.id`,
      [req.params.id]
    );
    if (task.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (req.user.role === 'admin' && task.rows[0].org_id !== req.user.org_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.user.role === 'volunteer') {
      const assigned = await pool.query(
        'SELECT id FROM volunteer_task_assignments WHERE task_id = $1 AND volunteer_id = $2',
        [req.params.id, req.user.id]
      );
      if (assigned.rowCount === 0) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const assignments = await pool.query(
      `SELECT vta.*, vp.display_name, u.email
       FROM volunteer_task_assignments vta
       JOIN volunteer_profiles vp ON vp.user_id = vta.volunteer_id
       JOIN users u ON u.id = vta.volunteer_id
       WHERE vta.task_id = $1
       ORDER BY vta.assigned_at DESC`,
      [req.params.id]
    );

    return res.json({ task: task.rows[0], assignments: assignments.rows });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', auth, requireRole('admin'), async (req, res) => {
  const allowedFields = [
    'title',
    'description',
    'location',
    'category',
    'required_skills',
    'volunteer_count_needed',
    'deadline',
    'status',
  ];

  const updates = [];
  const params = [];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      params.push(req.body[field]);
      updates.push(`${field} = $${params.length}`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'status') && req.body.status === 'completed') {
    params.push(new Date().toISOString());
    updates.push(`completed_at = $${params.length}`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  params.push(req.params.id, req.user.org_id);

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET ${updates.join(', ')}
       WHERE id = $${params.length - 1} AND org_id = $${params.length}
       RETURNING *`,
      params
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.json({ task: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 AND org_id = $2', [
      req.params.id,
      req.user.org_id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.json({ message: 'Task deleted' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
