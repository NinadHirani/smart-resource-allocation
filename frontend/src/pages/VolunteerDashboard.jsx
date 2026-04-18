import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatStatusLabel } from '../lib/constants';

export default function VolunteerDashboard() {
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  async function loadDashboard() {
    try {
      const [profileResponse, tasksResponse] = await Promise.all([api.get('/volunteers/profile'), api.get('/volunteers/my-tasks')]);
      setProfile(profileResponse.profile);
      setTasks(tasksResponse.tasks);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function completeTask(assignmentId) {
    try {
      await api.patch(`/volunteers/assignments/${assignmentId}/complete`, {});
      await loadDashboard();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  const activeTasks = tasks.filter((task) => task.assignment_status !== 'completed');
  const completedTasks = tasks.filter((task) => task.assignment_status === 'completed');

  return (
    <section className="page-grid">
      <div className="between">
        <div>
          <p className="eyebrow">Volunteer Dashboard</p>
          <h1 className="page-title">See what needs your attention right now</h1>
          <p className="page-copy">This is your home base for assignments, status, and profile readiness.</p>
        </div>
        <Link className="ghost-button" to="/volunteer/profile">
          Edit Profile
        </Link>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      <div className="stats-grid">
        <article className="stat-card">
          <span className="eyebrow">Display Name</span>
          <strong>{profile?.display_name || 'Volunteer'}</strong>
          <small>{profile?.is_available ? 'Available for new tasks' : 'Not available right now'}</small>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Active Assignments</span>
          <strong>{activeTasks.length}</strong>
          <small>Tasks currently in progress or accepted</small>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Completed</span>
          <strong>{completedTasks.length}</strong>
          <small>Assignments you have finished</small>
        </article>
      </div>
      <section className="panel">
        <div className="between">
          <div>
            <p className="eyebrow">Current Tasks</p>
            <h2>Your assigned work</h2>
          </div>
        </div>
        {tasks.length === 0 ? (
          <div className="empty-state">No assignments yet. Once an admin matches you to a task, it will show up here.</div>
        ) : (
          <div className="cards-grid">
            {tasks.map((task) => (
              <article key={task.assignment_id} className="task-card">
                <div className="task-card-header">
                  <div>
                    <span className="eyebrow">{task.category}</span>
                    <h3>{task.title}</h3>
                  </div>
                  <span className={`status-pill status-${task.status}`}>{formatStatusLabel(task.status)}</span>
                </div>
                <p>{task.description}</p>
                <div className="task-meta">
                  <span>{task.location}</span>
                  <span>Deadline: {task.deadline || 'Not specified'}</span>
                  <span>Assignment: {formatStatusLabel(task.assignment_status)}</span>
                </div>
                {task.assignment_status !== 'completed' ? (
                  <button className="primary-button" onClick={() => completeTask(task.assignment_id)} type="button">
                    Mark as Completed
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
