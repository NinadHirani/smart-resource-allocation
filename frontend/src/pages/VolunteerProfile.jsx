import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AVAILABILITY_SLOTS, TASK_SKILLS, formatStatusLabel } from '../lib/constants';

export default function VolunteerProfile({ dashboardMode = false }) {
  const [profile, setProfile] = useState({
    display_name: '',
    phone: '',
    skills: [],
    availability: [],
    location_preference: '',
    bio: '',
    is_available: true,
  });
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadData() {
    try {
      const [profileResponse, tasksResponse] = await Promise.all([api.get('/volunteers/profile'), api.get('/volunteers/my-tasks')]);
      setProfile(profileResponse.profile);
      setTasks(tasksResponse.tasks);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function toggleArrayValue(field, value) {
    setProfile((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/volunteers/profile', profile);
      setProfile(response.profile);
      setSuccess('Profile updated successfully.');
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function completeTask(assignmentId) {
    try {
      await api.patch(`/volunteers/assignments/${assignmentId}/complete`, {});
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <section className="page-grid">
      <div>
        <p className="eyebrow">{dashboardMode ? 'Volunteer Dashboard' : 'Volunteer Profile'}</p>
        <h1 className="page-title">{dashboardMode ? 'See your assignments and stay ready for the next one' : 'Keep your skills and availability current'}</h1>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}
      <div className="detail-grid">
        <section className="profile-card">
          <p className="eyebrow">Profile</p>
          <form className="form-grid" onSubmit={saveProfile}>
            <label className="field">
              <span>Display Name</span>
              <input
                required
                value={profile.display_name}
                onChange={(event) => setProfile((current) => ({ ...current, display_name: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={profile.phone || ''} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} />
            </label>
            <label className="field-full">
              <span>Location Preference</span>
              <input
                value={profile.location_preference || ''}
                onChange={(event) => setProfile((current) => ({ ...current, location_preference: event.target.value }))}
              />
            </label>
            <label className="field-full">
              <span>Bio</span>
              <textarea value={profile.bio || ''} onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))} />
            </label>
            <div className="field-full">
              <span>Skills</span>
              <div className="checkbox-grid">
                {TASK_SKILLS.map((skill) => (
                  <label key={skill} className="checkbox-option">
                    <input checked={profile.skills.includes(skill)} onChange={() => toggleArrayValue('skills', skill)} type="checkbox" />
                    {skill}
                  </label>
                ))}
              </div>
            </div>
            <div className="field-full">
              <span>Availability</span>
              <div className="checkbox-grid">
                {AVAILABILITY_SLOTS.map((slot) => (
                  <label key={slot} className="checkbox-option">
                    <input checked={profile.availability.includes(slot)} onChange={() => toggleArrayValue('availability', slot)} type="checkbox" />
                    {slot}
                  </label>
                ))}
              </div>
            </div>
            <label className="checkbox-option">
              <input
                checked={Boolean(profile.is_available)}
                onChange={(event) => setProfile((current) => ({ ...current, is_available: event.target.checked }))}
                type="checkbox"
              />
              Available for new tasks
            </label>
            <button className="primary-button" type="submit">
              Save Profile
            </button>
          </form>
        </section>
        <section className="panel">
          <p className="eyebrow">My Tasks</p>
          <h2>Assignments you are currently carrying</h2>
          {tasks.length === 0 ? (
            <div className="empty-state">No assignments yet. Once an admin matches you to a task, it will appear here.</div>
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
                    <span>Assignment: {task.assignment_status}</span>
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
      </div>
    </section>
  );
}
