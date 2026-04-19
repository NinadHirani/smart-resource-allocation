import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function adminLinks() {
  return [
    { to: '/admin', label: 'Overview' },
    { to: '/admin/reports', label: 'Need Reports' },
    { to: '/admin/tasks', label: 'Tasks' },
    { to: '/admin/volunteers', label: 'Volunteers' },
    { to: '/admin/analytics', label: 'Analytics' },
  ];
}

function volunteerLinks() {
  return [
    { to: '/volunteer/dashboard', label: 'Assignments' },
    { to: '/volunteer/profile', label: 'Edit Profile' },
  ];
}

export default function Sidebar() {
  const { user } = useAuth();
  const links = user?.role === 'admin' ? adminLinks() : volunteerLinks();

  return (
    <aside className="sidebar">
      {user?.role === 'admin' && (user.org_name || user.org_code) ? (
        <div className="sidebar-org">
          <strong>{user.org_name || 'Organization'}</strong>
          <small>Org Code: {user.org_code || 'Pending'}</small>
        </div>
      ) : null}
      {user?.role === 'volunteer' ? (
        <div className="sidebar-org volunteer">
          <strong>{user.display_name || 'Volunteer'}</strong>
          <small>{user.email}</small>
        </div>
      ) : null}
      {links.map((link) => (
        <NavLink
          key={link.to}
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          to={link.to}
        >
          {link.label}
        </NavLink>
      ))}
    </aside>
  );
}
