import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import { ToastProvider } from './components/Toast.jsx';
import AppShell from './components/AppShell.jsx';
import { homeOf } from './lib/roles.js';
import Landing from './pages/landing/Landing.jsx';
import ImportPage from './pages/ImportPage.jsx';
import Today from './pages/student/Today.jsx';
import Settings from './pages/student/Settings.jsx';
import VocabHome from './pages/vocab/VocabHome.jsx';
import Group from './pages/vocab/Group.jsx';
import SetPage from './pages/vocab/SetPage.jsx';
import Search from './pages/vocab/Search.jsx';
import Session from './pages/vocab/Session.jsx';
import Recall from './pages/vocab/Recall.jsx';
import Plan from './pages/plan/Plan.jsx';
import Overview from './pages/coach/Overview.jsx';
import DayDetail from './pages/coach/DayDetail.jsx';
import CoachSettings from './pages/coach/CoachSettings.jsx';

function RequireRole({ role }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to={'/login?next=' + encodeURIComponent(loc.pathname + loc.search)} replace />;
  if (user.role !== role) return <Navigate to={homeOf(user.role)} replace />;
  return <AppShell />;
}
function PublicFront() {
  const { user } = useAuth();
  return user ? <Navigate to={homeOf(user.role)} replace /> : <Landing />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<PublicFront />} />
          <Route path="/login" element={<PublicFront />} />
          <Route path="/signup" element={<PublicFront />} />
          <Route path="/import" element={<ImportPage />} />
          <Route element={<RequireRole role="student" />}>
            <Route path="/today" element={<Today />} />
            <Route path="/vocab" element={<VocabHome />} />
            <Route path="/vocab/g/:gid" element={<Group />} />
            <Route path="/vocab/set/:sid" element={<SetPage />} />
            <Route path="/vocab/search" element={<Search />} />
            <Route path="/vocab/session" element={<Session />} />
            <Route path="/recall" element={<Recall />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route element={<RequireRole role="coach" />}>
            <Route path="/coach" element={<Overview />} />
            <Route path="/coach/day/:date" element={<DayDetail />} />
            <Route path="/coach/settings" element={<CoachSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
