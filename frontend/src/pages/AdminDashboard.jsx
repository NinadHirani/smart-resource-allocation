import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import TaskCard from '../components/TaskCard';
import UrgencyBadge from '../components/UrgencyBadge';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [summaryResponse, reportsResponse, tasksResponse] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/reports?limit=5'),
          api.get('/tasks?limit=3'),
        ]);
        setSummary(summaryResponse);
        setReports(reportsResponse?.data ?? []);
        setTasks(tasksResponse?.data ?? []);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadDashboard();
  }, []);

  return (
    <section className="page-grid">
      <div>
        <p className="eyebrow">Admin Dashboard</p>
        <h1 className="page-title">See urgent needs and move the right people faster</h1>
        <p className="page-copy">A quick snapshot of new reports, open tasks, volunteer capacity, and what got completed this month.</p>
      </div>
      {user?.org_code ? (
        <div className="alert success">
          Your field agent form link: <strong>{window.location.origin}/report/{user.org_code}</strong> — share this with your field workers.
        </div>
      ) : null}
      {error ? <div className="alert error">{error}</div> : null}
      {summary ? (
        <div className="stats-grid">
          <article className="stat-card">
            <span className="eyebrow">Reports This Month</span>
            <strong>{summary.total_reports}</strong>
            <small>{summary.report_change_percent}% vs last month</small>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Open Tasks</span>
            <strong>{summary.open_tasks}</strong>
            <small>Tasks waiting for action</small>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Available Volunteers</span>
            <strong>{summary.available_volunteers}</strong>
            <small>Ready to be assigned</small>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Completed This Month</span>
            <strong>{summary.completed_this_month}</strong>
            <small>Resolved tasks</small>
          </article>
        </div>
      ) : null}
      <div className="detail-grid">
        <section className="panel">
          <div className="between">
            <div>
              <p className="eyebrow">Urgent Reports</p>
              <h2>Recent incoming needs</h2>
            </div>
            <Link className="ghost-button" to="/admin/reports">
              View All
            </Link>
          </div>
          {reports.length === 0 ? (
            <div className="empty-state">No reports yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Category</th>
                  <th>Urgency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <Link to={`/admin/reports/${report.id}`}>{report.location}</Link>
                    </td>
                    <td>{report.category}</td>
                    <td>
                      <UrgencyBadge score={report.urgency_score} />
                    </td>
                    <td>{report.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="panel">
          <div className="between">
            <div>
              <p className="eyebrow">Active Tasks</p>
              <h2>Where volunteers are needed</h2>
            </div>
            <Link className="ghost-button" to="/admin/tasks">
              Manage Tasks
            </Link>
          </div>
          <div className="cards-grid">
            {tasks.length === 0 ? <div className="empty-state">No tasks created yet.</div> : null}
            {tasks.map((task) => (
              <TaskCard key={task.id} href={`/admin/tasks/${task.id}`} task={task} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
