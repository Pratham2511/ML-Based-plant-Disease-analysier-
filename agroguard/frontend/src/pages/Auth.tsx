import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../components/AuthContext';
import LeafLoader from '../components/LeafLoader';

const Auth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loginWithGoogleCredential, startMobileGoogleSignIn, loading } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isNativePlatform = Capacitor.isNativePlatform();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleWebGoogleLogin = async (credential?: string) => {
    if (!credential) {
      setErrorMessage('Google did not return an ID token. Please try again.');
      return;
    }

    setErrorMessage('');
    setStatusMessage('Signing in with Google...');

    try {
      await loginWithGoogleCredential(credential);
      navigate('/dashboard');
    } catch (error: any) {
      setStatusMessage('');
      setErrorMessage(error?.response?.data?.detail || 'Google sign-in failed');
    }
  };

  const handleMobileSignIn = async () => {
    setErrorMessage('');
    setStatusMessage('Opening secure Google sign-in...');
    try {
      await startMobileGoogleSignIn();
      setStatusMessage('Complete Google sign-in in the opened browser.');
    } catch (error: any) {
      setStatusMessage('');
      setErrorMessage(error?.message || error?.response?.data?.detail || 'Unable to start Google sign-in');
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-intro">
        <p className="subtitle">{t('auth.subtitle')}</p>
        <h1 className="headline">Sign in with Google</h1>
        <p className="lead">AgroGuard now uses Google OAuth as the only secure login method for web and mobile.</p>

        <div className="auth-benefit-list">
          <div>
            <strong>1</strong>
            <p>One account across web and mobile app.</p>
          </div>
          <div>
            <strong>2</strong>
            <p>No password or OTP handling in AgroGuard.</p>
          </div>
          <div>
            <strong>3</strong>
            <p>Server validates Google token before creating session cookie.</p>
          </div>
        </div>
      </section>

      <section className="card auth-panel">
        <div className="auth-panel__header">
          <span className="pill">Google OAuth</span>
        </div>

        <div className="auth-form">
          {!googleClientId && (
            <p className="form-error">VITE_GOOGLE_CLIENT_ID is missing. Add it to frontend environment variables.</p>
          )}

          {!isNativePlatform && googleClientId && (
            <GoogleLogin
              onSuccess={(response: CredentialResponse) => handleWebGoogleLogin(response.credential)}
              onError={() => setErrorMessage('Google sign-in popup failed. Please retry.')}
              useOneTap
              theme="filled_blue"
              shape="pill"
              size="large"
              text="signin_with"
            />
          )}

          {isNativePlatform && (
            <button className="btn primary" type="button" onClick={handleMobileSignIn} disabled={!googleClientId || loading}>
              Continue with Google
            </button>
          )}

          <p className="panel-muted">After successful sign-in, AgroGuard stores a secure HttpOnly session cookie.</p>
        </div>

        {loading && <LeafLoader variant="panel" label={t('auth.processingRequest')} />}
        {statusMessage && <div className="success-box">{statusMessage}</div>}
        {errorMessage && <p className="form-error">{errorMessage}</p>}
      </section>
    </div>
  );
};

export default Auth;
