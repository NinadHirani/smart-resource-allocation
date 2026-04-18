import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { useAuth } from './context/AuthContext';
import AdminDashboard from './pages/AdminDashboard';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import NeedReports from './pages/NeedReports';
import PublicReportForm from './pages/PublicReportForm';
import Register from './pages/Register';
import ReportDetail from './pages/ReportDetail';
import TaskDetail from './pages/TaskDetail';
import Tasks from './pages/Tasks';
import VolunteerProfile from './pages/VolunteerProfile';
import Volunteers from './pages/Volunteers';

function Landing() {
  return (
    <main className="landing-shell">
      <section className="hero">
        <p className="eyebrow">GDSC Solution Challenge 2026</p>
        <h1>Turn scattered need reports into action-ready volunteer coordination.</h1>
        <p className="hero-copy">
          Smart Resource Allocation helps NGOs collect field reports, prioritize urgency with Gemini, and match the right volunteers to the right tasks.
        </p>
        <div className="hero-actions">
          <a className="primary-button" href="/register">
            Create Admin Account
          </a>
          <a className="ghost-button" href="/login">
            Volunteer Login
          </a>
        </div>
      </section>
    </main>
  );
}

function ProtectedRoute({ children, roles }) {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return <div className="page-message">Loading your workspace...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate replace to={user.role === 'admin' ? '/admin' : '/volunteer/dashboard'} />;
  }

  return children;
}

function AppLayout({ children, sidebar = true }) {
  return (
    <>
      <Navbar />
      <div className="app-shell">
        {sidebar ? <Sidebar /> : null}
        <div className="page-shell">{children}</div>
      </div>
    </>
  );
}

function RoleHome() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate replace to="/admin" />;
  if (user?.role === 'volunteer') return <Navigate replace to="/volunteer/dashboard" />;
  return <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleHome />} />
      <Route
        path="/login"
        element={
          <AppLayout sidebar={false}>
            <Login />
          </AppLayout>
        }
      />
      <Route
        path="/register"
        element={
          <AppLayout sidebar={false}>
            <Register />
          </AppLayout>
        }
      />
      <Route
        path="/report/:orgCode"
        element={
          <AppLayout sidebar={false}>
            <PublicReportForm />
          </AppLayout>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout>
              <AdminDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout>
              <NeedReports />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports/:id"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout>
              <ReportDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tasks"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout>
              <Tasks />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tasks/:id"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout>
              <TaskDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/volunteers"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout>
              <Volunteers />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout>
              <Analytics />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteer/dashboard"
        element={
          <ProtectedRoute roles={['volunteer']}>
            <AppLayout>
              <VolunteerProfile dashboardMode />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteer/profile"
        element={
          <ProtectedRoute roles={['volunteer']}>
            <AppLayout>
              <VolunteerProfile />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
