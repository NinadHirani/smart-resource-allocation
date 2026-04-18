import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await api.post('/auth/login', form);
      login(response);
      navigate(response.user.role === 'admin' ? '/admin' : '/volunteer/dashboard');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">Welcome Back</p>
      <h1 className="page-title">Sign in to your workspace</h1>
      <p className="page-copy">Admins manage reports and assignments. Volunteers track their active tasks and availability here.</p>
      {error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field-full">
          <span>Email</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </label>
        <label className="field-full">
          <span>Password</span>
          <input
            required
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
        </label>
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      <p className="page-copy">
        Need an account? <Link to="/register">Register here</Link>
      </p>
    </section>
  );
}
