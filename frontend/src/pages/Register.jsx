import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const initialAdmin = { org_name: '', email: '', password: '' };
const initialVolunteer = { name: '', email: '', password: '', phone: '' };

export default function Register() {
  const navigate = useNavigate();
  const { isAuthenticated, login, user } = useAuth();
  const [role, setRole] = useState('admin');
  const [adminForm, setAdminForm] = useState(initialAdmin);
  const [volunteerForm, setVolunteerForm] = useState(initialVolunteer);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'admin' ? '/admin' : '/volunteer/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (role === 'admin') {
        const response = await api.post('/auth/register/admin', adminForm);
        login({ token: response.token, user: response.user });
        setSuccess(`Organization created. Your public report code is ${response.org.org_code}.`);
        navigate('/admin');
      } else {
        const response = await api.post('/auth/register/volunteer', volunteerForm);
        login(response);
        navigate('/volunteer/dashboard');
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">Create Account</p>
      <h1 className="page-title">Start coordinating with clarity</h1>
      <div className="split-actions">
        <button className={role === 'admin' ? 'primary-button' : 'ghost-button'} onClick={() => setRole('admin')} type="button">
          Admin
        </button>
        <button
          className={role === 'volunteer' ? 'primary-button' : 'ghost-button'}
          onClick={() => setRole('volunteer')}
          type="button"
        >
          Volunteer
        </button>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}
      <form className="form-grid" onSubmit={handleSubmit}>
        {role === 'admin' ? (
          <>
            <label className="field-full">
              <span>Organization Name</span>
              <input
                required
                value={adminForm.org_name}
                onChange={(event) => setAdminForm((current) => ({ ...current, org_name: event.target.value }))}
              />
            </label>
            <label className="field-full">
              <span>Email</span>
              <input
                required
                type="email"
                value={adminForm.email}
                onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label className="field-full">
              <span>Password</span>
              <div className="password-row">
                <input
                  required
                  minLength={6}
                  type={showPassword ? 'text' : 'password'}
                  value={adminForm.password}
                  onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))}
                />
                <button className="ghost-button password-toggle" onClick={() => setShowPassword((current) => !current)} type="button">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
          </>
        ) : (
          <>
            <label className="field">
              <span>Name</span>
              <input
                required
                value={volunteerForm.name}
                onChange={(event) => setVolunteerForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                value={volunteerForm.phone}
                onChange={(event) => setVolunteerForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>
            <label className="field-full">
              <span>Email</span>
              <input
                required
                type="email"
                value={volunteerForm.email}
                onChange={(event) => setVolunteerForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label className="field-full">
              <span>Password</span>
              <div className="password-row">
                <input
                  required
                  minLength={6}
                  type={showPassword ? 'text' : 'password'}
                  value={volunteerForm.password}
                  onChange={(event) => setVolunteerForm((current) => ({ ...current, password: event.target.value }))}
                />
                <button className="ghost-button password-toggle" onClick={() => setShowPassword((current) => !current)} type="button">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
          </>
        )}
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Creating...' : role === 'admin' ? 'Create Admin Account' : 'Join as Volunteer'}
        </button>
      </form>
      <p className="page-copy">Admins manage organizations and tasks. Volunteers get a separate dashboard after signup.</p>
    </section>
  );
}
