const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/summary', auth, requireRole('admin'), async (req, res) => {
  try {
    const [reports, previousReports, openTasks, availableVolunteers, completedMonth] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total_reports
         FROM need_reports
         WHERE org_id = $1
           AND date_trunc('month', submitted_at) = date_trunc('month', NOW())`,
        [req.user.org_id]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total_reports
         FROM need_reports
         WHERE org_id = $1
           AND date_trunc('month', submitted_at) = date_trunc('month', NOW() - INTERVAL '1 month')`,
        [req.user.org_id]
      ),
      pool.query('SELECT COUNT(*)::int AS open_tasks FROM tasks WHERE org_id = $1 AND status = $2', [
        req.user.org_id,
        'open',
      ]),
      pool.query(
        `SELECT COUNT(*)::int AS available_volunteers
         FROM volunteer_profiles
         WHERE is_available = true`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS completed_this_month
         FROM tasks
         WHERE org_id = $1
           AND status = 'completed'
           AND date_trunc('month', completed_at) = date_trunc('month', NOW())`,
        [req.user.org_id]
      ),
    ]);

    const currentMonthReports = reports.rows[0].total_reports;
    const lastMonthReports = previousReports.rows[0].total_reports;
    const percentChange =
      lastMonthReports === 0
        ? (currentMonthReports > 0 ? 100 : 0)
        : Number((((currentMonthReports - lastMonthReports) / lastMonthReports) * 100).toFixed(1));

    return res.json({
      total_reports: currentMonthReports,
      last_month_reports: lastMonthReports,
      report_change_percent: percentChange,
      open_tasks: openTasks.rows[0].open_tasks,
      available_volunteers: availableVolunteers.rows[0].available_volunteers,
      completed_this_month: completedMonth.rows[0].completed_this_month,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/reports-by-category', auth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT category, COUNT(*)::int AS count
       FROM need_reports
       WHERE org_id = $1
         AND submitted_at >= NOW() - INTERVAL '30 days'
       GROUP BY category
       ORDER BY count DESC`,
      [req.user.org_id]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/reports-per-day', auth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT submitted_at::date AS date, COUNT(*)::int AS count
       FROM need_reports
       WHERE org_id = $1
         AND submitted_at >= NOW() - INTERVAL '14 days'
       GROUP BY submitted_at::date
       ORDER BY date ASC`,
      [req.user.org_id]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/task-status-breakdown', auth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM tasks
       WHERE org_id = $1
       GROUP BY status
       ORDER BY count DESC`,
      [req.user.org_id]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/needs-heatmap', auth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `WITH category_counts AS (
         SELECT
           location,
           category,
           COUNT(*) AS category_count
         FROM need_reports
         WHERE org_id = $1
         GROUP BY location, category
       ),
       ranked AS (
         SELECT
           location,
           category,
           category_count,
           ROW_NUMBER() OVER (PARTITION BY location ORDER BY category_count DESC, category ASC) AS rnk
         FROM category_counts
       )
       SELECT
         nr.location,
         COUNT(*)::int AS total_reports,
         COALESCE(AVG(nr.urgency_score), 0)::numeric(3,1) AS avg_urgency,
         MAX(CASE WHEN ranked.rnk = 1 THEN ranked.category END) AS top_category
       FROM need_reports nr
       LEFT JOIN ranked ON ranked.location = nr.location
       WHERE nr.org_id = $1
       GROUP BY nr.location
       ORDER BY avg_urgency DESC, total_reports DESC`,
      [req.user.org_id]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
