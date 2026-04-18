import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { useAuth } from './context/AuthContext';
import AdminDashboard from './pages/AdminDashboard';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import NeedReports from './pages/NeedReports';
import NewTask from './pages/NewTask';
import PublicReportForm from './pages/PublicReportForm';
import Register from './pages/Register';
import ReportDetail from './pages/ReportDetail';
import TaskDetail from './pages/TaskDetail';
import Tasks from './pages/Tasks';
import VolunteerDashboard from './pages/VolunteerDashboard';
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
          <a className="primary-button" href="/register">Create Admin Account</a>
          <a className="ghost-button" href="/login">Login</a>
        </div>
      </section>
      <section className="cards-grid">
        <article className="panel">
          <p className="eyebrow">For Admins</p>
          <h2>Review needs, create tasks, and coordinate the response.</h2>
          <p className="page-copy">Admins create the organization, get an `org_code`, review urgent reports, generate tasks, and assign volunteers with Gemini help.</p>
          <a className="primary-button" href="/register">Start as Admin</a>
        </article>
        <article className="panel">
          <p className="eyebrow">For Volunteers</p>
          <h2>Create your profile, track assignments, and mark work complete.</h2>
          <p className="page-copy">Volunteers register once, fill in their availability and skills, then use a dedicated dashboard to manage assigned tasks.</p>
          <a className="ghost-button" href="/register">Join as Volunteer</a>
        </article>
        <article className="panel">
          <p className="eyebrow">For Field Agents</p>
          <h2>Submit a report quickly from any phone using the organization code.</h2>
          <p className="page-copy">Open `/report/:orgCode` to submit urgent community needs without logging in.</p>
          <a className="ghost-button" href="/login">Need an org code?</a>
        </article>
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
      <div className={`app-shell${sidebar ? '' : ' no-sidebar'}`}>
        {sidebar ? <Sidebar /> : null}
        <div className={`page-shell${sidebar ? '' : ' auth-shell'}`}>{children}</div>
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
        path="/admin/tasks/new"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout>
              <NewTask />
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
              <VolunteerDashboard />
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
