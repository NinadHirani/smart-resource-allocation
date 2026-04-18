import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AVAILABILITY_SLOTS, TASK_SKILLS } from '../lib/constants';

export default function VolunteerProfile() {
  const [profile, setProfile] = useState({
    display_name: '',
    phone: '',
    skills: [],
    availability: [],
    location_preference: '',
    bio: '',
    is_available: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadData() {
    try {
      const profileResponse = await api.get('/volunteers/profile');
      setProfile(profileResponse.profile);
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

  return (
    <section className="page-grid">
      <div>
        <p className="eyebrow">Volunteer Profile</p>
        <h1 className="page-title">Keep your skills and availability current</h1>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}
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
    </section>
  );
}
