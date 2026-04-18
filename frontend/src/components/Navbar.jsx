import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <Link className="brand" to={user?.role === 'admin' ? '/admin' : user?.role === 'volunteer' ? '/volunteer/dashboard' : '/'}>
        <span className="brand-mark">SRA</span>
        <span>
          <strong>Smart Resource Allocation</strong>
          <small>Volunteer coordination for social impact</small>
        </span>
      </Link>
      <div className="topbar-actions">
        {user ? (
          <>
            <div className="user-chip">
              <span>{user.email}</span>
              <strong>{user.role}</strong>
            </div>
            <button className="ghost-button" onClick={logout} type="button">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link className="ghost-button" to="/login">
              Login
            </Link>
            <Link className="primary-button" to="/register">
              Get Started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
