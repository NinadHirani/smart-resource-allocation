const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { scoreNeedReport } = require('../services/gemini');
const { NEED_CATEGORIES, NEED_STATUSES } = require('../constants');
const { clampNumber, toArrayFilter } = require('../utils');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const validCategories = NEED_CATEGORIES;
const validStatuses = NEED_STATUSES;

async function applyUrgencyScoring(reportId) {
  const reportResult = await pool.query('SELECT * FROM need_reports WHERE id = $1', [reportId]);
  if (reportResult.rowCount === 0) return;

  const report = reportResult.rows[0];

  try {
    const ai = await scoreNeedReport(report);
    await pool.query(
      'UPDATE need_reports SET urgency_score = $1, urgency_reason = $2 WHERE id = $3',
      [Number(ai.urgency_score), ai.urgency_reason, reportId]
    );
  } catch (error) {
    try {
      const retry = await scoreNeedReport(report);
      await pool.query(
        'UPDATE need_reports SET urgency_score = $1, urgency_reason = $2 WHERE id = $3',
        [Number(retry.urgency_score), retry.urgency_reason, reportId]
      );
    } catch (retryError) {
      await pool.query('UPDATE need_reports SET urgency_score = NULL WHERE id = $1', [reportId]);
    }
  }
}

router.get('/public-org/:org_code', async (req, res) => {
  const { org_code: orgCode } = req.params;
  try {
    const org = await pool.query('SELECT id, name, org_code FROM organizations WHERE org_code = $1', [orgCode]);
    if (org.rowCount === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    return res.json({ org: org.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/public/:org_code', async (req, res) => {
  const { org_code: orgCode } = req.params;
  const {
    reporter_name: reporterName,
    reporter_phone: reporterPhone,
    location,
    category,
    description,
    severity_self_reported: severitySelfReported,
    affected_count: affectedCount,
  } = req.body;

  if (!reporterName || !location || !category || !description || description.length < 20) {
    return res.status(400).json({ error: 'Invalid report payload' });
  }

  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    const orgResult = await pool.query('SELECT id FROM organizations WHERE org_code = $1', [orgCode]);
    if (orgResult.rowCount === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const insert = await pool.query(
      `INSERT INTO need_reports(
         org_id, reporter_name, reporter_phone, location, category, description,
         severity_self_reported, affected_count, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending_review')
       RETURNING *`,
      [
        orgResult.rows[0].id,
        reporterName,
        reporterPhone || null,
        location,
        category,
        description,
        severitySelfReported || null,
        affectedCount || null,
      ]
    );

    const report = insert.rows[0];

    applyUrgencyScoring(report.id);

    return res.status(201).json({
      id: report.id,
      message: 'Your report has been submitted. Thank you.',
      ai_score_pending: true,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/', auth, requireRole('admin'), async (req, res) => {
  const {
    category,
    status,
    min_urgency: minUrgency,
    max_urgency: maxUrgency,
    from_date: fromDate,
    to_date: toDate,
    page = 1,
    limit = 20,
  } = req.query;

  const params = [req.user.org_id];
  const where = ['org_id = $1'];

  const categories = toArrayFilter(category).filter((item) => validCategories.includes(item));
  if (categories.length > 0) {
    params.push(categories);
    where.push(`category = ANY($${params.length}::text[])`);
  }
  const statuses = toArrayFilter(status).filter((item) => validStatuses.includes(item));
  if (statuses.length > 0) {
    params.push(statuses);
    where.push(`status = ANY($${params.length}::text[])`);
  }
  if (minUrgency) {
    params.push(minUrgency);
    where.push(`urgency_score >= $${params.length}`);
  }
  if (maxUrgency) {
    params.push(maxUrgency);
    where.push(`urgency_score <= $${params.length}`);
  }
  if (fromDate) {
    params.push(fromDate);
    where.push(`submitted_at::date >= $${params.length}`);
  }
  if (toDate) {
    params.push(toDate);
    where.push(`submitted_at::date <= $${params.length}`);
  }

  const currentPage = clampNumber(page, 1, 1, 1000);
  const perPage = clampNumber(limit, 20, 1, 50);
  const offset = (currentPage - 1) * perPage;

  try {
    const countQuery = `SELECT COUNT(*)::int AS total FROM need_reports WHERE ${where.join(' AND ')}`;
    const totalResult = await pool.query(countQuery, params);

    params.push(perPage, offset);
    const dataQuery = `
      SELECT *
      FROM need_reports
      WHERE ${where.join(' AND ')}
      ORDER BY urgency_score DESC NULLS LAST, submitted_at DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `;

    const result = await pool.query(dataQuery, params);
    return res.json({
      data: result.rows,
      total: totalResult.rows[0].total,
      page: currentPage,
      limit: perPage,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM need_reports WHERE id = $1 AND org_id = $2', [
      req.params.id,
      req.user.org_id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    return res.json({ report: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/status', auth, requireRole('admin'), async (req, res) => {
  const { status } = req.body;

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const result = await pool.query(
      'UPDATE need_reports SET status = $1 WHERE id = $2 AND org_id = $3 RETURNING *',
      [status, req.params.id, req.user.org_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    return res.json({ report: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:id/rescore', auth, requireRole('admin'), async (req, res) => {
  try {
    const reportCheck = await pool.query('SELECT id FROM need_reports WHERE id = $1 AND org_id = $2', [
      req.params.id,
      req.user.org_id,
    ]);

    if (reportCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await applyUrgencyScoring(req.params.id);

    const updated = await pool.query('SELECT * FROM need_reports WHERE id = $1', [req.params.id]);
    return res.json({ report: updated.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/import/csv', auth, requireRole('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }

  let records;
  try {
    records = parse(req.file.buffer.toString('utf8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid CSV format' });
  }

  if (records.length > 500) {
    return res.status(400).json({ error: 'CSV limit is 500 rows' });
  }

  const errors = [];
  const insertedIds = [];

  for (let i = 0; i < records.length; i += 1) {
    const row = records[i];
    const rowNo = i + 2;

    const description = row.description || '';
    if (!row.reporter_name || !row.location || !row.category || description.length < 20) {
      errors.push({ row: rowNo, reason: 'Missing required fields or short description' });
      continue;
    }

    if (!validCategories.includes(row.category)) {
      errors.push({ row: rowNo, reason: 'Invalid category' });
      continue;
    }

    try {
      const insert = await pool.query(
        `INSERT INTO need_reports(
          org_id, reporter_name, reporter_phone, location, category, description,
          severity_self_reported, affected_count, status
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'pending_review')
        RETURNING id`,
        [
          req.user.org_id,
          row.reporter_name,
          row.reporter_phone || null,
          row.location,
          row.category,
          description,
          row.severity_self_reported || null,
          row.affected_count ? Number(row.affected_count) : null,
        ]
      );
      insertedIds.push(insert.rows[0].id);
    } catch (error) {
      errors.push({ row: rowNo, reason: 'Database insert failed' });
    }
  }

  for (let i = 0; i < insertedIds.length; i += 1) {
    await applyUrgencyScoring(insertedIds[i]);
    if ((i + 1) % 10 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return res.json({ imported: insertedIds.length, errors });
});

router.get('/import/template', auth, requireRole('admin'), async (_req, res) => {
  const headers = [
    'reporter_name',
    'reporter_phone',
    'location',
    'category',
    'description',
    'severity_self_reported',
    'affected_count',
  ];
  const sampleRow = [
    'Asha Kumar',
    '+91-9999999999',
    'Ward 12',
    'Water',
    'Multiple families in the area have not had reliable clean drinking water for the last two days.',
    'High',
    '45',
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="need-reports-template.csv"');
  return res.send(`${headers.join(',')}\n${sampleRow.join(',')}\n`);
});

module.exports = router;
