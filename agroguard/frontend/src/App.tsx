import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';

import { AuthProvider, useAuth } from './components/AuthContext';
import AppSplash from './components/AppSplash';
import LanguageSwitcher from './components/LanguageSwitcher';
import Introduction from './pages/Introduction';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ScanHistory from './pages/ScanHistory';
import AreaIntelligence from './pages/AreaIntelligence';
import ProtectedRoute from './components/ProtectedRoute';

const SPLASH_STORAGE_KEY = 'agroguard-splash-seen';

const TopNavigation = () => {
  const { user, logout, loginWithGoogleCredential, startMobileGoogleSignIn } = useAuth();
  const { t } = useTranslation();

  const initiateLogin = useGoogleLogin({
    ux_mode: 'redirect',
    onSuccess: (codeResponse) => {
      // In redirect mode, the result is typically handled via a URL callback
      // or at the top level, but the hook still needs a configuration.
    },
    onError: (error) => console.error('Auth Error:', error),
  });

  const handleLoginClick = () => {
    if (Capacitor.isNativePlatform()) {
      startMobileGoogleSignIn();
    } else {
      initiateLogin();
    }
  };

  return (
    <header className="top-nav">
      <NavLink to="/" className="brand-mark">
        <div className="brand-mark__glyph" aria-hidden>
          <img src="/leaf.svg" alt="" />
        </div>
        <div>
          <strong>AgroGuard</strong>
          <small>{t('app.tagline')}</small>
        </div>
      </NavLink>

      <nav className="top-nav__links" aria-label={t('nav.primaryLabel')}>
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          {t('nav.dashboard')}
        </NavLink>
        <NavLink to="/area-intelligence" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          {t('nav.areaIntelligence')}
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          {t('nav.scanHistory')}
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          {t('nav.accountSettings')}
        </NavLink>
      </nav>

      <div className="top-nav__actions">
        <LanguageSwitcher />
        <span className="session-indicator">{user ? t('nav.sessionActive') : t('nav.loginRequired')}</span>
        {user ? (
          <button className="btn ghost" onClick={logout}>
            {t('nav.logout')}
          </button>
        ) : (
          <button className="btn primary" onClick={handleLoginClick}>
            {t('nav.login')}
          </button>
        )}
      </div>
    </header>
  );
};

const MobileDock = () => {
  const { t } = useTranslation();

  return (
    <nav className="mobile-dock" aria-label={t('nav.mobileQuickNavigation')}>
      <NavLink to="/" className={({ isActive }) => (isActive ? 'dock-link active' : 'dock-link')}>
        <span>{t('nav.home')}</span>
      </NavLink>
      <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'dock-link active' : 'dock-link')}>
        <span>{t('nav.dashboard')}</span>
      </NavLink>
      <NavLink to="/area-intelligence" className={({ isActive }) => (isActive ? 'dock-link active' : 'dock-link')}>
        <span>{t('nav.areaIntelligence')}</span>
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => (isActive ? 'dock-link active' : 'dock-link')}>
        <span>{t('nav.scanHistory')}</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => (isActive ? 'dock-link active' : 'dock-link')}>
        <span>{t('nav.accountSettings')}</span>
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
              <Route
                path="/area-intelligence"
                element={
                  <ProtectedRoute>
                    <AreaIntelligence />
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
