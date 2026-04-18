import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import UrgencyBadge from '../components/UrgencyBadge';
import { NEED_CATEGORIES, REPORT_STATUSES, TASK_SKILLS } from '../lib/constants';

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('reviewed');
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    location: '',
    category: NEED_CATEGORIES[0],
    required_skills: [],
    volunteer_count_needed: 1,
    deadline: '',
  });

  useEffect(() => {
    async function loadReport() {
      try {
        const response = await api.get(`/reports/${id}`);
        setReport(response.report);
        setStatus(response.report.status);
        setTaskForm({
          title: `${response.report.category} support for ${response.report.location}`,
          description: response.report.description,
          location: response.report.location,
          category: response.report.category,
          required_skills: [],
          volunteer_count_needed: 1,
          deadline: '',
        });
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadReport();
  }, [id]);

  const mapUrl = useMemo(() => {
    if (!report?.location) return '';
    return `https://www.google.com/maps?q=${encodeURIComponent(report.location)}&output=embed`;
  }, [report]);

  async function updateStatus() {
    try {
      const response = await api.patch(`/reports/${id}/status`, { status });
      setReport(response.report);
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  async function rescore() {
    try {
      const response = await api.post(`/reports/${id}/rescore`, {});
      setReport(response.report);
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  async function createTask(event) {
    event.preventDefault();
    try {
      const response = await api.post('/tasks', {
        ...taskForm,
        need_report_id: id,
        volunteer_count_needed: Number(taskForm.volunteer_count_needed),
      });
      navigate(`/admin/tasks/${response.task.id}`);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  function toggleSkill(skill) {
    setTaskForm((current) => ({
      ...current,
      required_skills: current.required_skills.includes(skill)
        ? current.required_skills.filter((item) => item !== skill)
        : [...current.required_skills, skill],
    }));
  }

  if (!report) return <div className="page-message">Loading report details...</div>;

  return (
    <section className="page-grid">
      {error ? <div className="alert error">{error}</div> : null}
      <div className="detail-grid">
        <article className="panel">
          <div className="between">
            <div>
              <p className="eyebrow">{report.category}</p>
              <h1 className="page-title">{report.location}</h1>
            </div>
            <UrgencyBadge score={report.urgency_score} />
          </div>
          <p>{report.description}</p>
          <div className="task-meta">
            <span>Severity: {report.severity_self_reported || 'Not specified'}</span>
            <span>Affected Count: {report.affected_count || 'Unknown'}</span>
            <span>Status: {report.status}</span>
          </div>
          <p className="muted">{report.urgency_reason || 'AI reasoning will appear here after scoring finishes.'}</p>
          <div className="toolbar">
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {REPORT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button className="ghost-button" onClick={updateStatus} type="button">
              Update Status
            </button>
            <button className="ghost-button" onClick={rescore} type="button">
              Re-run Urgency Scoring
            </button>
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Location</p>
          <iframe className="map-frame" loading="lazy" src={mapUrl} title="Location map" />
        </article>
      </div>
      <section className="panel">
        <p className="eyebrow">Create Task</p>
        <h2>Turn this need into a coordinated response</h2>
        <form className="form-grid" onSubmit={createTask}>
          <label className="field-full">
            <span>Title</span>
            <input
              required
              value={taskForm.title}
              onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className="field-full">
            <span>Description</span>
            <textarea
              required
              rows={5}
              value={taskForm.description}
              onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Location</span>
            <input
              required
              value={taskForm.location}
              onChange={(event) => setTaskForm((current) => ({ ...current, location: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select
              value={taskForm.category}
              onChange={(event) => setTaskForm((current) => ({ ...current, category: event.target.value }))}
            >
              {NEED_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Volunteer Count Needed</span>
            <input
              min="1"
              type="number"
              value={taskForm.volunteer_count_needed}
              onChange={(event) => setTaskForm((current) => ({ ...current, volunteer_count_needed: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Deadline</span>
            <input
              type="date"
              value={taskForm.deadline}
              onChange={(event) => setTaskForm((current) => ({ ...current, deadline: event.target.value }))}
            />
          </label>
          <div className="field-full">
            <span>Required Skills</span>
            <div className="checkbox-grid">
              {TASK_SKILLS.map((skill) => (
                <label key={skill} className="checkbox-option">
                  <input checked={taskForm.required_skills.includes(skill)} onChange={() => toggleSkill(skill)} type="checkbox" />
                  {skill}
                </label>
              ))}
            </div>
          </div>
          <button className="primary-button" type="submit">
            Create Task from Report
          </button>
        </form>
      </section>
    </section>
  );
}
