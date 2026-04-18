import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { NEED_CATEGORIES, TASK_STATUSES } from '../lib/constants';

const initialFilters = {
  status: '',
  category: '',
  from_deadline: '',
  to_deadline: '',
};

export default function Tasks() {
  const [filters, setFilters] = useState(initialFilters);
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTasks() {
      try {
        const query = new URLSearchParams({ ...filters, limit: '20', page: String(page) });
        const response = await api.get(`/tasks?${query.toString()}`);
        setTasks(response.data);
        setTotal(response.total);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadTasks();
  }, [filters, page]);

  return (
    <section className="page-grid">
      <div className="between">
        <div>
          <p className="eyebrow">Tasks</p>
          <h1 className="page-title">Track operational work from open to completed</h1>
        </div>
        <Link className="primary-button" to="/admin/tasks/new">
          + New Task
        </Link>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      <section className="panel">
        <div className="form-grid">
          <label className="field">
            <span>Status</span>
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All</option>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Category</span>
            <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
              <option value="">All</option>
              {NEED_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Deadline From</span>
            <input type="date" value={filters.from_deadline} onChange={(event) => setFilters((current) => ({ ...current, from_deadline: event.target.value }))} />
          </label>
          <label className="field">
            <span>Deadline To</span>
            <input type="date" value={filters.to_deadline} onChange={(event) => setFilters((current) => ({ ...current, to_deadline: event.target.value }))} />
          </label>
        </div>
      </section>
      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Location</th>
              <th>Deadline</th>
              <th>Needed</th>
              <th>Assigned</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <Link to={`/admin/tasks/${task.id}`}>{task.title}</Link>
                </td>
                <td>{task.category}</td>
                <td>{task.location}</td>
                <td>{task.deadline || '-'}</td>
                <td>{task.volunteer_count_needed}</td>
                <td>{task.volunteers_assigned || 0}</td>
                <td>{task.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="between">
        <span className="muted">
          Showing {tasks.length} of {total}
        </span>
        <div className="toolbar">
          <button className="ghost-button" disabled={page === 1} onClick={() => setPage((current) => current - 1)} type="button">
            Previous
          </button>
          <button className="ghost-button" disabled={page * 20 >= total} onClick={() => setPage((current) => current + 1)} type="button">
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
