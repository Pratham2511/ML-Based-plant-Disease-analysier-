import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';

import api from '../lib/api';
import { useAuth } from '../components/AuthContext';
import LeafLoader from '../components/LeafLoader';

const registerSchema = yup.object({
  email: yup.string().email().required(),
  password: yup
    .string()
    .min(8)
    .matches(/[A-Z]/, 'One uppercase')
    .matches(/[a-z]/, 'One lowercase')
    .matches(/[0-9]/, 'One number')
    .matches(/[^A-Za-z0-9]/, 'One special character')
    .required(),
  latitude: yup.number().required(),
  longitude: yup.number().required(),
});

type RegisterForm = yup.InferType<typeof registerSchema>;

const loginSchema = yup.object({
  email: yup.string().email().required(),
  password: yup
    .string()
    .min(8)
    .matches(/[A-Z]/, 'One uppercase')
    .matches(/[a-z]/, 'One lowercase')
    .matches(/[0-9]/, 'One number')
    .matches(/[^A-Za-z0-9]/, 'One special character')
    .required(),
  otp: yup.string().optional(),
});

type LoginForm = yup.InferType<typeof loginSchema>;

const Auth = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'register' | 'login' | 'otp'>('login');
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loginPayload, setLoginPayload] = useState<{ email: string; password: string } | null>(null);
  const { requestOtp, login, loading } = useAuth();
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

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
      setStatusMessage('Registration successful. Please login to receive OTP.');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || 'Registration failed');
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
      setStatusMessage('OTP sent to your email.');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || 'Unable to send OTP');
    }
  };

  const onOtpVerify = async (data: LoginForm) => {
    if (!loginPayload) return;
    setErrorMessage('');
    setStatusMessage('');
    try {
      await login(loginPayload.email, loginPayload.password, data.otp);
      navigate('/dashboard');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || 'Invalid OTP');
    }
  };

  const resendOtp = async () => {
    if (!loginPayload) return;
    setErrorMessage('');
    setStatusMessage('');
    try {
      await requestOtp(loginPayload.email, loginPayload.password);
      setStatusMessage('OTP resent successfully.');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || 'Unable to resend OTP');
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
  const otpProgress = (otpFilledCount / 6) * 100;

  const captureGeo = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        regForm.setValue('latitude', pos.coords.latitude);
        regForm.setValue('longitude', pos.coords.longitude);
      },
      () => setErrorMessage('Unable to access GPS. Enter latitude and longitude manually.')
    );
  };

  return (
    <div className="auth-layout">
      <section className="auth-intro">
        <p className="subtitle">Secure Access Layer</p>
        <h1 className="headline">Login to AgroGuard</h1>
        <p className="lead">
          Securely access your AgroGuard account using email verification and password protection.
        </p>

        <div className="auth-benefit-list">
          <div>
            <strong>1.</strong>
            <p>Enter your email and password.</p>
          </div>
          <div>
            <strong>2.</strong>
            <p>Verify the OTP sent to your email.</p>
          </div>
          <div>
            <strong>3.</strong>
            <p>Access your AgroGuard dashboard.</p>
          </div>
        </div>

        <div className="password-rules">
          <strong>Password Policy</strong>
          <ul>
            <li>Minimum 8 characters</li>
            <li>At least one uppercase and one lowercase letter</li>
            <li>At least one number and one special character</li>
          </ul>
        </div>
      </section>

      <section className="card auth-panel">
        <div className="auth-panel__header">
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={switchToRegister} type="button">
              Register
            </button>
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={switchToLogin} type="button">
              Login
            </button>
          </div>
          <span className="pill">Email OTP Enabled</span>
        </div>

        {tab === 'register' && (
          <form onSubmit={regForm.handleSubmit(onRegister)} className="auth-form">
            <label className="field-label" htmlFor="register-email">Email</label>
            <input id="register-email" className="input" placeholder="you@farmmail.com" {...regForm.register('email')} />

            <label className="field-label" htmlFor="register-password">Password</label>
            <input id="register-password" className="input" placeholder="Create secure password" type="password" {...regForm.register('password')} />

            <label className="field-label">Farm Coordinates</label>
            <div className="inline-row">
              <input className="input" placeholder="Latitude" type="number" step="any" {...regForm.register('latitude')} />
              <input className="input" placeholder="Longitude" type="number" step="any" {...regForm.register('longitude')} />
              <button type="button" className="btn ghost btn--compact" onClick={captureGeo}>
                Use GPS
              </button>
            </div>

            <button className="btn primary" type="submit" disabled={loading}>
              Create Account
            </button>

            <p className="form-error">{regForm.formState.errors.email?.message || regForm.formState.errors.password?.message || ''}</p>
          </form>
        )}

        {tab === 'login' && phase === 'login' && (
          <form onSubmit={loginForm.handleSubmit(onLoginRequest)} className="auth-form">
            <label className="field-label" htmlFor="login-email">Email</label>
            <input id="login-email" className="input" placeholder="you@farmmail.com" {...loginForm.register('email')} />

            <label className="field-label" htmlFor="login-password">Password</label>
            <input id="login-password" className="input" placeholder="Enter password" type="password" {...loginForm.register('password')} />

            <button className="btn primary" type="submit" disabled={loading}>
              Send OTP
            </button>

            <div className="panel-muted">OTP delivery usually completes in under 10 seconds.</div>
            <p className="form-error">{loginForm.formState.errors.email?.message || loginForm.formState.errors.password?.message || ''}</p>
          </form>
        )}

        {tab === 'login' && phase === 'otp' && (
          <form onSubmit={loginForm.handleSubmit(onOtpVerify)} className="auth-form">
            <input type="hidden" {...loginForm.register('otp')} />
            <label className="field-label">Enter 6-digit OTP</label>
            <div className="otp-progress" aria-hidden>
              <div className="otp-progress__bar" style={{ width: `${otpProgress}%` }} />
            </div>
            <p className="panel-muted">{otpFilledCount}/6 digits entered</p>
            <div className="otp-boxes">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpRefs.current[idx] = el)}
                  maxLength={1}
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(idx, event)}
                />
              ))}
            </div>

            <button className="btn primary" type="submit" disabled={loading || otpFilledCount < 6}>
              Verify OTP
            </button>

            <button type="button" className="btn ghost" disabled={loading} onClick={resendOtp}>
              Resend OTP
            </button>

            <button type="button" className="btn outline" disabled={loading} onClick={switchToLogin}>
              Back to Credentials
            </button>

            <div className="panel-muted">Secure login with Email OTP.</div>
          </form>
        )}

        {loading && <LeafLoader variant="panel" label="Processing secure request" />}
        {statusMessage && <div className="success-box">{statusMessage}</div>}
        {errorMessage && <p className="form-error">{errorMessage}</p>}
      </section>
    </div>
  );
};

export default Auth;
