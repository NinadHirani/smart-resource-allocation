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
  const [status, setStatus] = useState('open');

  async function loadTask() {
    try {
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
    setSelectedVolunteerIds((current) =>
      current.includes(volunteerId) ? current.filter((item) => item !== volunteerId) : [...current, volunteerId]
    );
  }

  async function findMatches() {
    try {
      const response = await api.post(`/matching/task/${id}/suggest`, {});
      setMatches(response.matches);
    } catch (matchError) {
      setError(matchError.message);
    }
  }

  async function assignVolunteers() {
    try {
      await api.post(`/matching/task/${id}/assign`, { volunteer_ids: selectedVolunteerIds });
      setSelectedVolunteerIds([]);
      await loadTask();
    } catch (assignError) {
      setError(assignError.message);
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

  if (!task) return <div className="page-message">Loading task details...</div>;

  return (
    <section className="page-grid">
      {error ? <div className="alert error">{error}</div> : null}
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
          <button className="primary-button" onClick={findMatches} type="button">
            Find Best Volunteers
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
            <button className="primary-button" disabled={selectedVolunteerIds.length === 0} onClick={assignVolunteers} type="button">
              Assign Selected
            </button>
          </div>
          <div className="page-grid">
            {matches.length === 0 ? <div className="empty-state">Run AI matching to see suggested volunteers.</div> : null}
            {matches.map((match) => (
              <MatchCard
                key={match.volunteer.id}
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
