import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../api/client';
import { NEED_CATEGORIES } from '../lib/constants';

const initialForm = {
  reporter_name: '',
  reporter_phone: '',
  location: '',
  category: NEED_CATEGORIES[0],
  description: '',
  severity_self_reported: 'Medium',
  affected_count: '',
};

export default function PublicReportForm() {
  const { orgCode } = useParams();
  const [org, setOrg] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadOrg() {
      try {
        const response = await fetch(`${API_BASE_URL}/reports/public-org/${orgCode}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to load organization');
        setOrg(payload.org);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadOrg();
  }, [orgCode]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/reports/public/${orgCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          affected_count: form.affected_count ? Number(form.affected_count) : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Submission failed');
      setSuccess(payload.message);
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-message">Loading report form...</div>;

  return (
    <section className="auth-card">
      <p className="eyebrow">Field Report</p>
      <h1 className="page-title">Report a community need</h1>
      <p className="page-copy">
        {org ? `Submitting for ${org.name} (${org.org_code})` : 'This organization code could not be found.'}
      </p>
      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}
      {org ? (
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Reporter Name</span>
            <input
              required
              value={form.reporter_name}
              onChange={(event) => setForm((current) => ({ ...current, reporter_name: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Phone</span>
            <input
              value={form.reporter_phone}
              onChange={(event) => setForm((current) => ({ ...current, reporter_phone: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Location</span>
            <input
              required
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            >
              {NEED_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Severity</span>
            <select
              value={form.severity_self_reported}
              onChange={(event) => setForm((current) => ({ ...current, severity_self_reported: event.target.value }))}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>
          <label className="field">
            <span>Affected Count</span>
            <input
              min="0"
              type="number"
              value={form.affected_count}
              onChange={(event) => setForm((current) => ({ ...current, affected_count: event.target.value }))}
            />
          </label>
          <label className="field-full">
            <span>Description</span>
            <textarea
              minLength={20}
              required
              rows={6}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      ) : null}
    </section>
  );
}
