import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import { ToastProvider } from './components/Toast.jsx';
import AppShell from './components/AppShell.jsx';
import Login, { homeOf } from './pages/Login.jsx';
import Today from './pages/student/Today.jsx';
import Settings from './pages/student/Settings.jsx';
import VocabHome from './pages/vocab/VocabHome.jsx';
import Group from './pages/vocab/Group.jsx';
import SetPage from './pages/vocab/SetPage.jsx';
import Search from './pages/vocab/Search.jsx';
import Plan from './pages/plan/Plan.jsx';
import Overview from './pages/teacher/Overview.jsx';
import DayDetail from './pages/teacher/DayDetail.jsx';
import TeacherSettings from './pages/teacher/TeacherSettings.jsx';

function RequireRole({ role }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to={'/login?next=' + encodeURIComponent(loc.pathname + loc.search)} replace />;
  if (user.role !== role) return <Navigate to={homeOf(user.role)} replace />;
  return <AppShell />;
}
function LoginRoute() {
  const { user } = useAuth();
  return user ? <Navigate to={homeOf(user.role)} replace /> : <Login />;
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<RequireRole role="student" />}>
            <Route path="/" element={<Today />} />
            <Route path="/vocab" element={<VocabHome />} />
            <Route path="/vocab/g/:gid" element={<Group />} />
            <Route path="/vocab/set/:sid" element={<SetPage />} />
            <Route path="/vocab/search" element={<Search />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route element={<RequireRole role="teacher" />}>
            <Route path="/teacher" element={<Overview />} />
            <Route path="/teacher/day/:date" element={<DayDetail />} />
            <Route path="/teacher/settings" element={<TeacherSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </HashRouter>
  );
}
