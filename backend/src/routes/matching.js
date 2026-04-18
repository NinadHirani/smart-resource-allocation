const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { matchVolunteers } = require('../services/gemini');
const { sendAssignmentEmail } = require('../services/mailer');

const router = express.Router();

function buildFallbackMatches(task, volunteers) {
  return volunteers
    .map((volunteer) => {
      const taskSkills = new Set((task.required_skills || []).map((skill) => skill.toLowerCase()));
      const volunteerSkills = (volunteer.skills || []).map((skill) => skill.toLowerCase());
      const matchedSkills = volunteerSkills.filter((skill) => taskSkills.has(skill)).length;
      const locationMatch =
        volunteer.location_preference &&
        task.location &&
        volunteer.location_preference.toLowerCase().includes(task.location.toLowerCase());
      const score = Math.min(100, 40 + matchedSkills * 20 + (locationMatch ? 15 : 0));

      return {
        volunteer,
        match_score: score,
        reason:
          matchedSkills > 0
            ? `Shares ${matchedSkills} required skill${matchedSkills === 1 ? '' : 's'} and is currently available.`
            : 'Currently available and potentially suitable based on profile details.',
      };
    })
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 3);
}

router.post('/task/:task_id/suggest', auth, requireRole('admin'), async (req, res) => {
  const { task_id: taskId } = req.params;

  try {
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1 AND org_id = $2', [
      taskId,
      req.user.org_id,
    ]);

    if (taskResult.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    const volunteersResult = await pool.query(
      `SELECT
         u.id,
         vp.display_name,
         vp.skills,
         vp.availability,
         vp.location_preference,
         vp.bio
       FROM users u
       JOIN volunteer_profiles vp ON vp.user_id = u.id
       WHERE vp.is_available = true`
    );

    const volunteers = volunteersResult.rows;

    if (volunteers.length === 0) {
      return res.json({ matches: [] });
    }

    let matches = [];

    try {
      const ai = await matchVolunteers(task, volunteers);
      matches = Array.isArray(ai.matches) ? ai.matches : [];
    } catch (error) {
      matches = [];
    }

    const hydrated = matches
      .slice(0, 3)
      .map((m) => {
        const volunteer = volunteers.find((v) => v.id === m.volunteer_id);
        if (!volunteer) return null;
        return {
          volunteer,
          match_score: m.match_score,
          reason: m.reason,
        };
      })
      .filter(Boolean);

    return res.json({ matches: hydrated.length > 0 ? hydrated : buildFallbackMatches(task, volunteers) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/task/:task_id/assign', auth, requireRole('admin'), async (req, res) => {
  const { task_id: taskId } = req.params;
  const { volunteer_id: volunteerId, volunteer_ids: volunteerIds, match_score: matchScore, reason } = req.body;
  const assignees = Array.isArray(volunteerIds) && volunteerIds.length > 0 ? volunteerIds : volunteerId ? [volunteerId] : [];

  if (assignees.length === 0) {
    return res.status(400).json({ error: 'volunteer_id or volunteer_ids is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const taskResult = await client.query('SELECT * FROM tasks WHERE id = $1 AND org_id = $2', [
      taskId,
      req.user.org_id,
    ]);

    if (taskResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found' });
    }

    if (assignees.length > (taskResult.rows[0].volunteer_count_needed || 1)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Assignment exceeds volunteer_count_needed' });
    }

    const volunteerResult = await client.query(
      `SELECT u.id, u.email, vp.display_name
       FROM users u
       JOIN volunteer_profiles vp ON vp.user_id = u.id
       WHERE u.id = ANY($1::uuid[])`,
      [assignees]
    );

    if (volunteerResult.rowCount !== assignees.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'One or more volunteers were not found' });
    }

    const assignments = [];
    for (const assigneeId of assignees) {
      const assignmentResult = await client.query(
        `INSERT INTO volunteer_task_assignments(
           volunteer_id, task_id, assigned_by, gemini_match_score, gemini_reason, status
         ) VALUES($1,$2,$3,$4,$5,'accepted')
         ON CONFLICT (volunteer_id, task_id) DO UPDATE
         SET gemini_match_score = EXCLUDED.gemini_match_score,
             gemini_reason = EXCLUDED.gemini_reason,
             status = 'accepted',
             assigned_at = NOW()
         RETURNING *`,
        [assigneeId, taskId, req.user.id, matchScore || null, reason || null]
      );
      assignments.push(assignmentResult.rows[0]);
    }

    await client.query("UPDATE tasks SET status = 'in_progress' WHERE id = $1", [taskId]);

    await client.query('COMMIT');

    const task = taskResult.rows[0];
    volunteerResult.rows.forEach((volunteer) => {
      sendAssignmentEmail({
        to: volunteer.email,
        task,
        adminEmail: req.user.email,
        dashboardUrl: `${process.env.FRONTEND_URL}/volunteer/dashboard`,
      }).catch(() => {
        // Keep assignment successful even if email fails.
      });
    });

    return res.status(201).json({ assignments });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
