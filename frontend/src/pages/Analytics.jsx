import { useEffect, useState } from 'react';
import { api } from '../api/client';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import PieChart from '../components/charts/PieChart';

export default function Analytics() {
  const [data, setData] = useState({
    summary: null,
    byCategory: [],
    perDay: [],
    taskStatus: [],
    heatmap: [],
  });
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [summary, byCategory, perDay, taskStatus, heatmap] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/analytics/reports-by-category'),
          api.get('/analytics/reports-per-day'),
          api.get('/analytics/task-status-breakdown'),
          api.get('/analytics/needs-heatmap'),
        ]);
        setData({ summary, byCategory, perDay, taskStatus, heatmap });
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadAnalytics();
  }, []);

  return (
    <section className="page-grid">
      <div>
        <p className="eyebrow">Analytics</p>
        <h1 className="page-title">Understand what your organization is seeing and resolving</h1>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {data.summary ? (
        <div className="stats-grid">
          <article className="stat-card">
            <span className="eyebrow">Reports This Month</span>
            <strong>{data.summary.total_reports}</strong>
            <small>{data.summary.report_change_percent}% vs previous month</small>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Open Tasks</span>
            <strong>{data.summary.open_tasks}</strong>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Available Volunteers</span>
            <strong>{data.summary.available_volunteers}</strong>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Completed This Month</span>
            <strong>{data.summary.completed_this_month}</strong>
          </article>
        </div>
      ) : null}
      <div className="cards-grid">
        <section className="panel">
          <p className="eyebrow">By Category</p>
          <BarChart
            label="Reports"
            labels={data.byCategory.map((item) => item.category)}
            values={data.byCategory.map((item) => item.count)}
          />
        </section>
        <section className="panel">
          <p className="eyebrow">Daily Trend</p>
          <LineChart
            label="Reports Per Day"
            labels={data.perDay.map((item) => new Date(item.date).toLocaleDateString())}
            values={data.perDay.map((item) => item.count)}
          />
        </section>
        <section className="panel">
          <p className="eyebrow">Task Status</p>
          <PieChart labels={data.taskStatus.map((item) => item.status)} values={data.taskStatus.map((item) => item.count)} />
        </section>
      </div>
      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Total Reports</th>
              <th>Average Urgency</th>
              <th>Top Category</th>
            </tr>
          </thead>
          <tbody>
            {data.heatmap.map((row) => (
              <tr key={row.location}>
                <td>{row.location}</td>
                <td>{row.total_reports}</td>
                <td>{row.avg_urgency}</td>
                <td>{row.top_category || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}
