import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import MatchCard from '../components/MatchCard';
import { TASK_STATUSES, formatStatusLabel } from '../lib/constants';

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedVolunteerIds, setSelectedVolunteerIds] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [status, setStatus] = useState('open');
  const [matching, setMatching] = useState(false);
  const [assigning, setAssigning] = useState(false);

  async function loadTask() {
    try {
      setError('');
      const response = await api.get(`/tasks/${id}`);
      setTask(response.task);
      setAssignments(response.assignments);
      setStatus(response.task.status);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadTask();
  }, [id]);

  function toggleVolunteer(volunteerId) {
    const maxSelectable = Number(task?.volunteer_count_needed || 1);
    setSelectedVolunteerIds((current) =>
      current.includes(volunteerId)
        ? current.filter((item) => item !== volunteerId)
        : current.length >= maxSelectable
          ? current
          : [...current, volunteerId]
    );
  }

  async function findMatches() {
    setMatching(true);
    setError('');
    try {
      const response = await api.post(`/matching/task/${id}/suggest`, {});
      setMatches(response.matches);
    } catch (matchError) {
      setError(matchError.message);
    } finally {
      setMatching(false);
    }
  }

  async function assignVolunteers() {
    setAssigning(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.post(`/matching/task/${id}/assign`, { volunteer_ids: selectedVolunteerIds });
      setSelectedVolunteerIds([]);
      setSuccessMsg('Volunteer(s) assigned successfully. Email notification sent.');
      await loadTask();
    } catch (assignError) {
      setError(assignError.message);
    } finally {
      setAssigning(false);
    }
  }

  async function updateStatus() {
    try {
      const response = await api.patch(`/tasks/${id}`, { status });
      setTask(response.task);
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  useEffect(() => {
    if (!successMsg) return undefined;

    const timeoutId = window.setTimeout(() => setSuccessMsg(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [successMsg]);

  if (!task && !error) return <div className="page-message">Loading task details...</div>;
  if (error && !task)
    return (
      <section className="page-grid">
        <div className="alert error">{error}</div>
      </section>
    );

  const selectionLimit = Number(task?.volunteer_count_needed || 1);

  return (
    <section className="page-grid">
      {error ? <div className="alert error">{error}</div> : null}
      {successMsg ? <div className="alert success">{successMsg}</div> : null}
      <article className="panel">
        <div className="between">
          <div>
            <p className="eyebrow">{task.category}</p>
            <h1 className="page-title">{task.title}</h1>
          </div>
          <span className={`status-pill status-${task.status}`}>{formatStatusLabel(task.status)}</span>
        </div>
        <p>{task.description}</p>
        <div className="task-meta">
          <span>{task.location}</span>
          <span>Deadline: {task.deadline || 'Not specified'}</span>
          <span>
            Assigned: {task.volunteers_assigned || 0}/{task.volunteer_count_needed || 1}
          </span>
          <span>Skills: {(task.required_skills || []).join(', ') || 'No skills specified'}</span>
        </div>
        <div className="toolbar">
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {TASK_STATUSES.map((item) => (
              <option key={item} value={item}>
                {formatStatusLabel(item)}
              </option>
            ))}
          </select>
          <button className="ghost-button" onClick={updateStatus} type="button">
            Update Task Status
          </button>
          <button className="primary-button" disabled={matching} onClick={findMatches} type="button">
            {matching ? 'Gemini AI is finding matches...' : 'Find Best Volunteers'}
          </button>
        </div>
      </article>
      <div className="detail-grid">
        <section className="panel">
          <div className="between">
            <div>
              <p className="eyebrow">AI Suggestions</p>
              <h2>Top volunteer matches</h2>
            </div>
            <button
              className="primary-button"
              disabled={selectedVolunteerIds.length === 0 || assigning}
              onClick={assignVolunteers}
              type="button"
            >
              {assigning ? 'Assigning...' : 'Assign Selected'}
            </button>
          </div>
          <p className="muted">Select up to {selectionLimit} volunteer(s).</p>
          <div className="page-grid">
            {matches.length === 0 ? <div className="empty-state">Run AI matching to see suggested volunteers.</div> : null}
            {matches.map((match) => (
              <MatchCard
                key={match.volunteer.id}
                disabled={!selectedVolunteerIds.includes(match.volunteer.id) && selectedVolunteerIds.length >= selectionLimit}
                match={match}
                onToggle={toggleVolunteer}
                selected={selectedVolunteerIds.includes(match.volunteer.id)}
              />
            ))}
          </div>
        </section>
        <section className="panel">
          <p className="eyebrow">Current Assignments</p>
          <h2>Who is already attached to this task</h2>
          {assignments.length === 0 ? (
            <div className="empty-state">Nobody assigned yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Match Score</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{assignment.display_name}</td>
                    <td>{assignment.email}</td>
                    <td>{assignment.status}</td>
                    <td>{assignment.gemini_match_score || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </section>
  );
}
