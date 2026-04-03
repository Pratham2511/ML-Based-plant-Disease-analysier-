import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';

import { AuthProvider, useAuth } from './components/AuthContext';
import AppSplash from './components/AppSplash';
import LanguageSwitcher from './components/LanguageSwitcher';
import FarmSelector from './components/FarmSelector';
import Introduction from './pages/Introduction';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ScanHistory from './pages/ScanHistory';
import AreaIntelligence from './pages/AreaIntelligence';
import KrushiVibhag from './pages/KrushiVibhag';
import ProtectedRoute from './components/ProtectedRoute';
import { FarmProvider } from './context/FarmContext';

const SPLASH_STORAGE_KEY = 'shetvaidya-splash-seen';

const TopNavigation = () => {
  const { user, loading, logout, loginWithGoogleAccessToken, startMobileGoogleSignIn } = useAuth();
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const currentLang = i18n.language.split('-')[0];

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
    } catch (err: any) {
      alert(`${t('auth.errors.loginTriggerError')}: ${err.message}`);
    }
  };

  return (
    <>
      <header className={`top-nav w-full max-w-[100vw] ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="top-nav__left">
          <img src="/assets/shetvaidya-navbar-mobile.svg" alt="ShetVaidya" height={36} className="brand-lockup-mobile" />
          <div className="mobile-lang-switcher" aria-label={t('language.label')}>
            {['mr', 'en', 'hi'].map((lang) => (
              <button
                key={lang}
                type="button"
                className={`lang-pill ${currentLang === lang ? 'active' : ''}`}
                onClick={() => i18n.changeLanguage(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="desktop-only-inline">
            <LanguageSwitcher compact />
          </div>
        </div>

        <NavLink to="/" className="brand-mark brand-mark--desktop min-w-0" aria-label="ShetVaidya">
          <img src="/assets/shetvaidya-navbar-desktop.svg" alt="ShetVaidya" height={48} className="brand-lockup-desktop" />
        </NavLink>

        <div className="top-nav__right max-w-full flex-shrink-0">
          <span className="session-indicator desktop-only">
            {loading ? t('auth.restoringSession') : user ? t('nav.sessionActive') : t('nav.loginRequired')}
          </span>

          <div className="top-nav__desktop-action">
            {user ? (
              <button className="btn ghost flex-shrink-0 whitespace-nowrap" onClick={logout} disabled={loading}>
                {t('nav.logout')}
              </button>
            ) : (
              <button className="btn primary flex-shrink-0 whitespace-nowrap" onClick={handleLoginClick} disabled={loading}>
                {t('nav.login')}
              </button>
            )}
          </div>

        </div>

        <nav className="top-nav__links" aria-label={t('nav.primaryLabel')}>
          {user ? <FarmSelector compact /> : null}
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            {t('nav.dashboard')}
          </NavLink>
          <NavLink to="/area-intelligence" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            {t('nav.areaIntelligence')}
          </NavLink>
          <NavLink to="/krushi-vibhag" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            {t('nav.krushiVibhag')}
          </NavLink>
          <NavLink to="/scan-history" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            {t('nav.scanHistory')}
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            {t('nav.accountSettings')}
          </NavLink>
        </nav>
      </header>
    </>
  );
};

const MobileBottomTabBar = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const isActive = (paths: string[]) => paths.includes(location.pathname);

  return (
    <nav className="mobile-bottom-tab-bar" aria-label={t('nav.mobileQuickNavigation')}>
      <button onClick={() => navigate('/')} className={isActive(['/']) ? 'tab-active' : ''}>
        <span className="tab-icon">🏠</span>
        <span className="tab-label">{t('nav.home')}</span>
      </button>
      <button onClick={() => navigate('/dashboard')} className={isActive(['/dashboard']) ? 'tab-active' : ''}>
        <span className="tab-icon">📊</span>
        <span className="tab-label">{t('nav.dashboard')}</span>
      </button>
      <button onClick={() => navigate('/scan-history')} className={isActive(['/scan-history', '/history']) ? 'tab-active' : ''}>
        <span className="tab-icon">🕐</span>
        <span className="tab-label">{t('nav.history')}</span>
      </button>
      <button onClick={() => navigate('/krushi-vibhag')} className={isActive(['/krushi-vibhag']) ? 'tab-active' : ''}>
        <span className="tab-icon">🌾</span>
        <span className="tab-label">{t('nav.krushiVibhag')}</span>
      </button>
      <button onClick={() => navigate('/profile')} className={isActive(['/profile']) ? 'tab-active' : ''}>
        <span className="tab-icon">👤</span>
        <span className="tab-label">{t('nav.profile')}</span>
      </button>
    </nav>
  );
};

function App() {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(() => sessionStorage.getItem(SPLASH_STORAGE_KEY) !== 'true');
  const [dismissConfigWarning, setDismissConfigWarning] = useState(false);

  const apiBaseUrl = String(import.meta.env.VITE_API_URL || '').trim();
  const isProd = Boolean(import.meta.env.PROD);

  const getApiConfigWarning = () => {
    if (!isProd) return '';

    if (!apiBaseUrl) {
      return 'VITE_API_URL is missing in production. Auth requests may hit the frontend and return 404.';
    }

    // Relative API base (for example "/api") is valid when a proxy/rewrite is configured.
    if (apiBaseUrl.startsWith('/')) {
      return '';
    }

    try {
      const apiUrl = new URL(apiBaseUrl);
      if (apiUrl.origin === window.location.origin) {
        return `VITE_API_URL points to the frontend origin (${apiUrl.origin}). Set it to your backend origin to avoid auth 404 errors.`;
      }
    } catch {
      return 'VITE_API_URL is not a valid URL. Set it to your backend origin.';
    }

    return '';
  };

  const apiConfigWarning = getApiConfigWarning();

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
      <FarmProvider>
        <div className="app-shell app-shell--safe">
          {apiConfigWarning && !dismissConfigWarning ? (
            <section className="startup-config-warning" role="alert" aria-live="polite">
              <p>{apiConfigWarning}</p>
              <button type="button" className="btn ghost btn--compact" onClick={() => setDismissConfigWarning(true)}>
                Dismiss
              </button>
            </section>
          ) : null}
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
                  path="/scan-history"
                  element={
                    <ProtectedRoute>
                      <ScanHistory />
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
                <Route
                  path="/krushi-vibhag"
                  element={
                    <ProtectedRoute>
                      <KrushiVibhag />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
          <MobileBottomTabBar />
        </div>
      </FarmProvider>
    </AuthProvider>
  );
}

export default App;
