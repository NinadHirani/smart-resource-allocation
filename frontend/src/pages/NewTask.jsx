import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { NEED_CATEGORIES, TASK_SKILLS } from '../lib/constants';

const initialForm = {
  title: '',
  description: '',
  location: '',
  category: NEED_CATEGORIES[0],
  required_skills: [],
  volunteer_count_needed: 1,
  deadline: '',
};

export default function NewTask() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function toggleSkill(skill) {
    setForm((current) => ({
      ...current,
      required_skills: current.required_skills.includes(skill)
        ? current.required_skills.filter((item) => item !== skill)
        : [...current.required_skills, skill],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await api.post('/tasks', {
        ...form,
        volunteer_count_needed: Number(form.volunteer_count_needed),
      });
      navigate(`/admin/tasks/${response.task.id}`);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-grid">
      <div>
        <p className="eyebrow">New Task</p>
        <h1 className="page-title">Create a standalone response task</h1>
        <p className="page-copy">Use this when a task does not start directly from a need report.</p>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      <section className="panel">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-full">
            <span>Title</span>
            <input
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className="field-full">
            <span>Description</span>
            <textarea
              required
              rows={5}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
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
            <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
              {NEED_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Volunteers Needed</span>
            <input
              min="1"
              type="number"
              value={form.volunteer_count_needed}
              onChange={(event) => setForm((current) => ({ ...current, volunteer_count_needed: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Deadline</span>
            <input type="date" value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} />
          </label>
          <div className="field-full">
            <span>Required Skills</span>
            <div className="checkbox-grid">
              {TASK_SKILLS.map((skill) => (
                <label key={skill} className="checkbox-option">
                  <input checked={form.required_skills.includes(skill)} onChange={() => toggleSkill(skill)} type="checkbox" />
                  {skill}
                </label>
              ))}
            </div>
          </div>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Creating Task...' : 'Create Task'}
          </button>
        </form>
      </section>
    </section>
  );
}
