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
    onSuccess: (tokenResponse) => {
      if (tokenResponse.access_token) {
        // Handle OAuth2 exchange if needed, but we typically use ID tokens.
        // For simplicity and alignment with existing AuthContext:
        // loginWithGoogleCredential(tokenResponse.access_token);
      }
    },
    // We prefer implicit flow or credential flow. 
    // Since AuthContext already has loginWithGoogleCredential for ID tokens,
    // and Capacitor has its own flow, we'll wrap them here.
  });

  // Since useGoogleLogin from @react-oauth/google (for web) 
  // and startMobileGoogleSignIn (for mobile) are different, 
  // we dispatch based on platform.
  const handleLoginClick = () => {
    if (Capacitor.isNativePlatform()) {
      startMobileGoogleSignIn();
    } else {
      // For web, useGoogleLogin doesn't return the Credential (ID Token) easily 
      // in the basic hook mode without prompt. But we can use the 'google' global 
      // or just trigger the standard popup which we'll configure.
      // Actually, let's use a more direct approach that matches the 'GoogleLogin' 
      // component's behavior but via a hook.
      
      // If we want the one-tap or popup, we can use the library's built-in 
      // but for a button click 'useGoogleLogin' is standard.
      // However, it returns an access_token. Our backend expects a credential (ID Token).
      // Let's use the standard window.google identity API if the hook doesn't provide it.
      
      // REVISION: To keep it strictly to the library's hook:
      // We'll use the 'useGoogleLogin' hook which triggers the OAuth2 flow.
      // But let's check if we can get the ID Token.
      (window as any).google?.accounts.id.prompt();
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
