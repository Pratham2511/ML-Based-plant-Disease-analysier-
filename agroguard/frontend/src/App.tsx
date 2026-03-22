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
  const { user, loading, logout, loginWithGoogleAccessToken, startMobileGoogleSignIn } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 2);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const initiateLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        if (!tokenResponse.access_token) {
          throw new Error('Google access token was not returned by OAuth flow');
        }
        await loginWithGoogleAccessToken(tokenResponse.access_token);
      } catch (err: any) {
        const message = err.response?.data?.detail || err.message || 'Google login handoff failed';
        alert(`${t('auth.errors.authErrorTitle')}: ${message}`);
      }
    },
    onError: (error) => {
      console.error('Auth Error:', error);
      alert(t('auth.errors.googleAuthInitFailed'));
    },
  });

  const handleLoginClick = () => {
    try {
      if (Capacitor.isNativePlatform()) {
        startMobileGoogleSignIn();
      } else {
        initiateLogin();
      }
      setMobileMenuOpen(false);
    } catch (err: any) {
      alert(`${t('auth.errors.loginTriggerError')}: ${err.message}`);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header className={`top-nav w-full max-w-[100vw] ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="top-nav__left">
          <LanguageSwitcher compact />
        </div>

        <NavLink to="/" className="brand-mark min-w-0">
          <div className="brand-mark__glyph" aria-hidden>
            <img src="/leaf.svg" alt="" />
          </div>
          <div>
            <strong>AgroGuard</strong>
            <small>{t('app.tagline')}</small>
          </div>
        </NavLink>

        <div className="top-nav__right max-w-full flex-shrink-0">
          <span className="session-indicator desktop-only">
            {loading ? t('auth.restoringSession') : user ? t('nav.sessionActive') : t('nav.loginRequired')}
          </span>

          <div className="top-nav__desktop-action">
            {user ? (
              <button className="btn ghost flex-shrink-0 whitespace-nowrap" onClick={logout} disabled={loading}>
                {loading ? t('auth.restoringSession') : t('nav.logout')}
              </button>
            ) : (
              <button className="btn primary flex-shrink-0 whitespace-nowrap" onClick={handleLoginClick} disabled={loading}>
                {loading ? t('auth.restoringSession') : t('nav.login')}
              </button>
            )}
          </div>

          <div className="top-nav__mobile-action">
            {user ? (
              <button
                type="button"
                className="top-nav__hamburger"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            ) : (
              <button className="btn primary top-nav__mobile-login" onClick={handleLoginClick} disabled={loading}>
                {loading ? (
                  <>
                    <span className="btn__spinner" aria-hidden />
                    <span className="btn__mobile-loading-text">{t('common.loading')}</span>
                  </>
                ) : (
                  t('nav.login')
                )}
              </button>
            )}
          </div>
        </div>

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
      </header>

      {user ? (
        <>
          <button
            type="button"
            className={`mobile-drawer-backdrop ${mobileMenuOpen ? 'open' : ''}`}
            onClick={closeMobileMenu}
            aria-label={t('nav.closeMenuBackdrop')}
          />
          <aside className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
            <div className="mobile-drawer__head">
              <strong>AgroGuard</strong>
              <button type="button" className="mobile-drawer__close" onClick={closeMobileMenu} aria-label={t('nav.closeMenu')}>
                ✕
              </button>
            </div>
            <nav className="mobile-drawer__links" aria-label={t('nav.primaryLabel')}>
              <NavLink to="/dashboard" className="mobile-drawer__link" onClick={closeMobileMenu}>
                {t('nav.dashboard')}
              </NavLink>
              <NavLink to="/area-intelligence" className="mobile-drawer__link" onClick={closeMobileMenu}>
                {t('nav.areaIntelligence')}
              </NavLink>
              <NavLink to="/history" className="mobile-drawer__link" onClick={closeMobileMenu}>
                {t('nav.scanHistory')}
              </NavLink>
              <NavLink to="/profile" className="mobile-drawer__link" onClick={closeMobileMenu}>
                {t('nav.accountSettings')}
              </NavLink>
            </nav>
            <button
              className="btn ghost mobile-drawer__logout"
              onClick={async () => {
                await logout();
                closeMobileMenu();
              }}
              disabled={loading}
            >
              {loading ? t('auth.restoringSession') : t('nav.logout')}
            </button>
          </aside>
        </>
      ) : null}
    </>
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
      <div className="app-shell app-shell--safe">
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
      </div>
    </AuthProvider>
  );
}

export default App;
