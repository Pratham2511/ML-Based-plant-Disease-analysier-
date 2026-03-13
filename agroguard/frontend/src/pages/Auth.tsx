import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import api from '../lib/api';
import { useAuth } from '../components/AuthContext';
import LeafLoader from '../components/LeafLoader';
import { localizeNumericText } from '../utils/localization';

type RegisterForm = {
  email: string;
  password: string;
  latitude: number;
  longitude: number;
};

type LoginForm = {
  email: string;
  password: string;
  otp?: string;
};

const Auth = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'register' | 'login' | 'otp'>('login');
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loginPayload, setLoginPayload] = useState<{ email: string; password: string } | null>(null);
  const { requestOtp, login, loading } = useAuth();
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const registerSchema = useMemo(
    () =>
      yup.object({
        email: yup.string().email(t('auth.validation.email')).required(t('auth.validation.required')),
        password: yup
          .string()
          .min(8, t('auth.validation.passwordMin'))
          .matches(/[A-Z]/, t('auth.validation.uppercase'))
          .matches(/[a-z]/, t('auth.validation.lowercase'))
          .matches(/[0-9]/, t('auth.validation.number'))
          .matches(/[^A-Za-z0-9]/, t('auth.validation.special'))
          .required(t('auth.validation.required')),
        latitude: yup.number().required(t('auth.validation.required')),
        longitude: yup.number().required(t('auth.validation.required')),
      }),
    [t]
  );

  const loginSchema = useMemo(
    () =>
      yup.object({
        email: yup.string().email(t('auth.validation.email')).required(t('auth.validation.required')),
        password: yup
          .string()
          .min(8, t('auth.validation.passwordMin'))
          .matches(/[A-Z]/, t('auth.validation.uppercase'))
          .matches(/[a-z]/, t('auth.validation.lowercase'))
          .matches(/[0-9]/, t('auth.validation.number'))
          .matches(/[^A-Za-z0-9]/, t('auth.validation.special'))
          .required(t('auth.validation.required')),
        otp: yup.string().optional(),
      }),
    [t]
  );

  const regForm = useForm<RegisterForm>({ resolver: yupResolver(registerSchema) });
  const loginForm = useForm<LoginForm>({ resolver: yupResolver(loginSchema) });

  const switchToRegister = () => {
    setTab('register');
    setPhase('register');
    setErrorMessage('');
    setStatusMessage('');
  };

  const switchToLogin = () => {
    setTab('login');
    setPhase('login');
    setErrorMessage('');
    setStatusMessage('');
  };

  const onRegister = async (data: RegisterForm) => {
    setErrorMessage('');
    setStatusMessage('');
    try {
      await api.post('/auth/register', data);
      switchToLogin();
      setStatusMessage(t('auth.messages.registrationSuccess'));
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || t('auth.errors.registrationFailed'));
    }
  };

  const onLoginRequest = async (data: LoginForm) => {
    setErrorMessage('');
    setStatusMessage('');
    try {
      await requestOtp(data.email, data.password);
      setLoginPayload({ email: data.email, password: data.password });
      setPhase('otp');
      setOtpDigits(Array(6).fill(''));
      loginForm.setValue('otp', '');
      setStatusMessage(t('auth.messages.otpSent'));
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || t('auth.errors.otpSendFailed'));
    }
  };

  const onOtpVerify = async (data: LoginForm) => {
    if (!loginPayload) return;
    const otpCode = data.otp?.trim() || '';
    if (otpCode.length !== 6) {
      setErrorMessage(t('auth.errors.invalidOtp'));
      return;
    }
    setErrorMessage('');
    setStatusMessage('');
    try {
      await login(loginPayload.email, loginPayload.password, otpCode);
      navigate('/dashboard');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || t('auth.errors.invalidOtp'));
    }
  };

  const resendOtp = async () => {
    if (!loginPayload) return;
    setErrorMessage('');
    setStatusMessage('');
    try {
      await requestOtp(loginPayload.email, loginPayload.password);
      setStatusMessage(t('auth.messages.otpResent'));
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || t('auth.errors.otpResendFailed'));
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    loginForm.setValue('otp', next.join(''));
    if (value && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const otpFilledCount = otpDigits.filter(Boolean).length;
  const otpProgressText = localizeNumericText(t('auth.otpProgress', { count: otpFilledCount }), i18n.language);

  const captureGeo = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        regForm.setValue('latitude', Number(pos.coords.latitude.toFixed(6)));
        regForm.setValue('longitude', Number(pos.coords.longitude.toFixed(6)));
      },
      () => setErrorMessage(t('auth.errors.gpsFailed'))
    );
  };

  const registerError =
    regForm.formState.errors.email?.message ||
    regForm.formState.errors.password?.message ||
    regForm.formState.errors.latitude?.message ||
    regForm.formState.errors.longitude?.message ||
    '';

  const loginError =
    loginForm.formState.errors.email?.message ||
    loginForm.formState.errors.password?.message ||
    loginForm.formState.errors.otp?.message ||
    '';

  return (
    <div className="auth-layout">
      <section className="auth-intro">
        <p className="subtitle">{t('auth.subtitle')}</p>
        <h1 className="headline">{t('auth.title')}</h1>
        <p className="lead">{t('auth.lead')}</p>

        <div className="auth-benefit-list">
          <div>
            <strong>{t('auth.steps.step1Index')}</strong>
            <p>{t('auth.steps.step1')}</p>
          </div>
          <div>
            <strong>{t('auth.steps.step2Index')}</strong>
            <p>{t('auth.steps.step2')}</p>
          </div>
          <div>
            <strong>{t('auth.steps.step3Index')}</strong>
            <p>{t('auth.steps.step3')}</p>
          </div>
        </div>

        <div className="password-rules">
          <strong>{t('auth.passwordPolicyTitle')}</strong>
          <ul>
            <li>{t('auth.passwordRules.minLength')}</li>
            <li>{t('auth.passwordRules.upperLower')}</li>
            <li>{t('auth.passwordRules.numberSpecial')}</li>
          </ul>
        </div>
      </section>

      <section className="card auth-panel">
        <div className="auth-panel__header">
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={switchToRegister} type="button">
              {t('auth.tabs.register')}
            </button>
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={switchToLogin} type="button">
              {t('auth.tabs.login')}
            </button>
          </div>
          <span className="pill">{t('auth.otpEnabled')}</span>
        </div>

        {tab === 'register' && (
          <form onSubmit={regForm.handleSubmit(onRegister)} className="auth-form">
            <label className="field-label" htmlFor="register-email">
              {t('auth.labels.email')}
            </label>
            <input id="register-email" className="input" placeholder={t('auth.placeholders.email')} {...regForm.register('email')} />

            <label className="field-label" htmlFor="register-password">
              {t('auth.labels.password')}
            </label>
            <input
              id="register-password"
              className="input"
              placeholder={t('auth.placeholders.createPassword')}
              type="password"
              {...regForm.register('password')}
            />

            <label className="field-label">{t('auth.labels.farmCoordinates')}</label>
            <div className="inline-row">
              <input className="input" placeholder={t('auth.placeholders.latitude')} type="number" step="any" {...regForm.register('latitude')} />
              <input className="input" placeholder={t('auth.placeholders.longitude')} type="number" step="any" {...regForm.register('longitude')} />
              <button type="button" className="btn ghost btn--compact" onClick={captureGeo}>
                {t('auth.buttons.useGps')}
              </button>
            </div>

            <button className="btn primary" type="submit" disabled={loading}>
              {t('auth.buttons.createAccount')}
            </button>

            <p className="form-error">{registerError}</p>
          </form>
        )}

        {tab === 'login' && phase === 'login' && (
          <form onSubmit={loginForm.handleSubmit(onLoginRequest)} className="auth-form">
            <label className="field-label" htmlFor="login-email">
              {t('auth.labels.email')}
            </label>
            <input id="login-email" className="input" placeholder={t('auth.placeholders.email')} {...loginForm.register('email')} />

            <label className="field-label" htmlFor="login-password">
              {t('auth.labels.password')}
            </label>
            <input
              id="login-password"
              className="input"
              placeholder={t('auth.placeholders.enterPassword')}
              type="password"
              {...loginForm.register('password')}
            />

            <button className="btn primary" type="submit" disabled={loading}>
              {t('auth.buttons.sendOtp')}
            </button>

            <div className="panel-muted">{t('auth.otpDeliveryNote')}</div>
            <p className="form-error">{loginError}</p>
          </form>
        )}

        {tab === 'login' && phase === 'otp' && (
          <form onSubmit={loginForm.handleSubmit(onOtpVerify)} className="auth-form">
            <input type="hidden" {...loginForm.register('otp')} />
            <label className="field-label">{t('auth.labels.enterOtp')}</label>
            <div className="otp-progress" aria-hidden>
              <progress className="otp-progress__bar" value={otpFilledCount} max={6} />
            </div>
            <p className="panel-muted">{otpProgressText}</p>
            <div className="otp-boxes">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpRefs.current[idx] = el)}
                  maxLength={1}
                  inputMode="numeric"
                  title={t('auth.labels.enterOtp')}
                  placeholder="0"
                  autoComplete="one-time-code"
                  aria-label={`${t('auth.labels.enterOtp')} ${idx + 1}`}
                  value={digit}
                  onChange={(event) => handleOtpChange(idx, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(idx, event)}
                />
              ))}
            </div>

            <button className="btn primary" type="submit" disabled={loading || otpFilledCount < 6}>
              {t('auth.buttons.verifyOtp')}
            </button>

            <button type="button" className="btn ghost" disabled={loading} onClick={resendOtp}>
              {t('auth.buttons.resendOtp')}
            </button>

            <button type="button" className="btn outline" disabled={loading} onClick={switchToLogin}>
              {t('auth.buttons.backToCredentials')}
            </button>

            <div className="panel-muted">{t('auth.secureLoginNote')}</div>
          </form>
        )}

        {loading && <LeafLoader variant="panel" label={t('auth.processingRequest')} />}
        {statusMessage && <div className="success-box">{statusMessage}</div>}
        {errorMessage && <p className="form-error">{errorMessage}</p>}
      </section>
    </div>
  );
};

export default Auth;
