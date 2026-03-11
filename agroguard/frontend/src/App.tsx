import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from './components/AuthContext';
import AppSplash from './components/AppSplash';
import Introduction from './pages/Introduction';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ScanHistory from './pages/ScanHistory';
import ProtectedRoute from './components/ProtectedRoute';

const SPLASH_STORAGE_KEY = 'agroguard-splash-seen';

const TopNavigation = () => {
  const { user, logout } = useAuth();

  return (
    <header className="top-nav">
      <NavLink to="/" className="brand-mark">
        <div className="brand-mark__glyph" aria-hidden>
          <img src="/leaf.svg" alt="" />
        </div>
        <div>
          <strong>AgroGuard</strong>
          <small>Plant Intelligence Suite</small>
        </div>
      </NavLink>

      <nav className="top-nav__links" aria-label="Primary">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Dashboard
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Scan History
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Account Settings
        </NavLink>
      </nav>

      <div className="top-nav__actions">
        <span className="session-indicator">{user ? 'Session Active' : 'Guest Mode'}</span>
        {user ? (
          <button className="btn ghost" onClick={logout}>
            Logout
          </button>
        ) : (
          <NavLink to="/auth" className="btn primary">
            Login
          </NavLink>
        )}
      </div>
    </header>
  );
};

const MobileDock = () => {
  return (
    <nav className="mobile-dock" aria-label="Mobile quick navigation">
      <NavLink to="/" className={({ isActive }) => (isActive ? 'dock-link active' : 'dock-link')}>
        <span>Home</span>
      </NavLink>
      <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'dock-link active' : 'dock-link')}>
        <span>Dashboard</span>
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => (isActive ? 'dock-link active' : 'dock-link')}>
        <span>History</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => (isActive ? 'dock-link active' : 'dock-link')}>
        <span>Account Settings</span>
      </NavLink>
    </nav>
  );
};

function App() {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(() => sessionStorage.getItem(SPLASH_STORAGE_KEY) !== 'true');

  useEffect(() => {
    if (!showSplash) return;
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(SPLASH_STORAGE_KEY, 'true');
      setShowSplash(false);
    }, 1300);
    return () => window.clearTimeout(timer);
  }, [showSplash]);

  return (
    <AuthProvider>
      <div className="app-shell">
        {showSplash && <AppSplash />}
        <TopNavigation />
        <main className="route-stage">
          <div className="route-transition" key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<Introduction />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <ScanHistory />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <MobileDock />
      </div>
    </AuthProvider>
  );
}

export default App;
