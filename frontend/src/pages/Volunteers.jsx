import { Fragment, useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Volunteers() {
  const [skillFilter, setSkillFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('true');
  const [volunteers, setVolunteers] = useState([]);
  const [expandedVolunteerId, setExpandedVolunteerId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadVolunteers() {
      try {
        const query = new URLSearchParams({
          is_available: availabilityFilter,
          ...(skillFilter ? { skills: skillFilter } : {}),
        });
        const response = await api.get(`/volunteers?${query.toString()}`);
        setVolunteers(response.volunteers);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadVolunteers();
  }, [skillFilter, availabilityFilter]);

  function toggleVolunteerRow(volunteerId) {
    setExpandedVolunteerId((current) => (current === volunteerId ? null : volunteerId));
  }

  return (
    <section className="page-grid">
      <div>
        <p className="eyebrow">Volunteers</p>
        <h1 className="page-title">Browse your available volunteer pool</h1>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      <section className="panel">
        <div className="form-grid">
          <label className="field">
            <span>Skill</span>
            <input value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)} placeholder="First Aid, Teaching..." />
          </label>
          <label className="field">
            <span>Availability</span>
            <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
              <option value="true">Available Only</option>
              <option value="false">Unavailable Only</option>
            </select>
          </label>
        </div>
      </section>
      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Skills</th>
              <th>Availability</th>
              <th>Location Preference</th>
            </tr>
          </thead>
          <tbody>
            {volunteers.map((volunteer) => (
              <Fragment key={volunteer.user_id}>
                <tr
                  onClick={() => toggleVolunteerRow(volunteer.user_id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{volunteer.display_name}</td>
                  <td>{volunteer.email}</td>
                  <td>{(volunteer.skills || []).join(', ') || '-'}</td>
                  <td>{(volunteer.availability || []).join(', ') || '-'}</td>
                  <td>{volunteer.location_preference || '-'}</td>
                </tr>
                {expandedVolunteerId === volunteer.user_id ? (
                  <tr>
                    <td colSpan="5">
                      <div className="expanded-row">
                        <strong>{volunteer.display_name}</strong>
                        <span>Skills: {(volunteer.skills || []).join(', ') || 'No skills added yet'}</span>
                        <span>Availability: {(volunteer.availability || []).join(', ') || 'Not specified'}</span>
                        <span>Location preference: {volunteer.location_preference || 'Not specified'}</span>
                        <span>Bio: {volunteer.bio || 'No bio added yet'}</span>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}
