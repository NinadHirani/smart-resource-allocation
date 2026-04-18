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
    { to: '/volunteer/dashboard', label: 'My Dashboard' },
    { to: '/volunteer/profile', label: 'Profile' },
  ];
}

export default function Sidebar() {
  const { user } = useAuth();
  const links = user?.role === 'admin' ? adminLinks() : volunteerLinks();

  return (
    <aside className="sidebar">
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
