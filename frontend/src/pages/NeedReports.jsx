import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, api } from '../api/client';
import UrgencyBadge from '../components/UrgencyBadge';
import { NEED_CATEGORIES, REPORT_STATUSES } from '../lib/constants';

const initialFilters = {
  category: '',
  status: '',
  min_urgency: '1',
  max_urgency: '10',
  from_date: '',
  to_date: '',
};

export default function NeedReports() {
  const [filters, setFilters] = useState(initialFilters);
  const [reports, setReports] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    async function loadReports() {
      try {
        const query = new URLSearchParams({ ...filters, page: String(page), limit: '20' });
        const response = await api.get(`/reports?${query.toString()}`);
        setReports(response.data);
        setTotal(response.total);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadReports();
  }, [filters, page]);

  async function handleImport(event) {
    event.preventDefault();
    if (!csvFile) return;

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const response = await api.post('/reports/import/csv', formData);
      setImportResult(response);
      setPage(1);
      const refreshed = await api.get('/reports?limit=20&page=1');
      setReports(refreshed.data);
      setTotal(refreshed.total);
    } catch (importError) {
      setError(importError.message);
    }
  }

  async function downloadTemplate() {
    try {
      const token = localStorage.getItem('sra_token');
      const response = await fetch(`${API_BASE_URL}/reports/import/template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error('Unable to download template');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'need-reports-template.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message);
    }
  }

  return (
    <section className="page-grid">
      <div className="between">
        <div>
          <p className="eyebrow">Need Reports</p>
          <h1 className="page-title">Review incoming field data and prioritize the queue</h1>
        </div>
        <div className="toolbar">
          <button className="ghost-button" onClick={downloadTemplate} type="button">
            Download CSV Template
          </button>
        </div>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {importResult ? (
        <div className="alert success">
          Imported {importResult.imported} rows. {importResult.errors.length} rows had issues.
        </div>
      ) : null}
      <section className="panel">
        <div className="form-grid">
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
            <span>Status</span>
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All</option>
              {REPORT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Min Urgency</span>
            <input
              max="10"
              min="1"
              type="number"
              value={filters.min_urgency}
              onChange={(event) => setFilters((current) => ({ ...current, min_urgency: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Max Urgency</span>
            <input
              max="10"
              min="1"
              type="number"
              value={filters.max_urgency}
              onChange={(event) => setFilters((current) => ({ ...current, max_urgency: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>From</span>
            <input type="date" value={filters.from_date} onChange={(event) => setFilters((current) => ({ ...current, from_date: event.target.value }))} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={filters.to_date} onChange={(event) => setFilters((current) => ({ ...current, to_date: event.target.value }))} />
          </label>
        </div>
      </section>
      <section className="panel">
        <form className="toolbar" onSubmit={handleImport}>
          <input accept=".csv" onChange={(event) => setCsvFile(event.target.files?.[0] || null)} type="file" />
          <button className="primary-button" type="submit">
            Import CSV
          </button>
        </form>
      </section>
      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Category</th>
              <th>Description</th>
              <th>Severity</th>
              <th>Urgency</th>
              <th>Affected</th>
              <th>Date</th>
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
                <td>{report.description.slice(0, 90)}...</td>
                <td>{report.severity_self_reported || '-'}</td>
                <td>
                  <UrgencyBadge score={report.urgency_score} />
                </td>
                <td>{report.affected_count || '-'}</td>
                <td>{new Date(report.submitted_at).toLocaleDateString()}</td>
                <td>{report.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="between">
        <span className="muted">
          Showing {reports.length} of {total}
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
      {importResult?.errors?.length ? (
        <section className="panel">
          <h2>Import Errors</h2>
          <ul>
            {importResult.errors.map((item) => (
              <li key={`${item.row}-${item.reason}`}>
                Row {item.row}: {item.reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
