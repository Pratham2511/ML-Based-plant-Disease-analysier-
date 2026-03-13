import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import api from '../lib/api';
import { useAuth } from '../components/AuthContext';
import LeafLoader from '../components/LeafLoader';
import ReadAloudButton from '../components/ReadAloudButton';

type NameForm = { full_name: string };
type EmailForm = { email: string; otp?: string };
type PasswordForm = { current_password: string; new_password: string; confirm_password: string };

const Profile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const nameForm = useForm<NameForm>({
    defaultValues: {
      full_name: user?.full_name || '',
    },
  });

  const emailForm = useForm<EmailForm>({
    defaultValues: {
      email: user?.email || '',
      otp: '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const displayName = nameForm.watch('full_name') || user?.full_name || t('dashboard.notAvailable');

  const requestOtp = async () => {
    setErrorMessage('');
    setStatusMessage('');

    setPendingAction('email-otp');
    try {
      await api.post('/auth/change-email-request', { email: emailForm.getValues('email') });
      setStatusMessage(t('profile.messages.otpSent'));
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || t('profile.errors.unableToSendOtp'));
    } finally {
      setPendingAction(null);
    }
  };

  const submitEmailChange = async (data: EmailForm) => {
    setErrorMessage('');
    setStatusMessage('');

    setPendingAction('email-verify');
    try {
      await api.post('/auth/change-email-verify', { email: data.email, otp: data.otp });
      setStatusMessage(t('profile.messages.emailUpdated'));
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || t('profile.errors.emailUpdateFailed'));
    } finally {
      setPendingAction(null);
    }
  };

  const submitProfile = async (data: NameForm) => {
    setErrorMessage('');
    setStatusMessage('');

    if (!data.full_name?.trim()) {
      setErrorMessage(t('profile.errors.fullNameRequired'));
      return;
    }

    setPendingAction('profile');
    try {
      await api.post('/auth/profile', { full_name: data.full_name.trim() });
      setStatusMessage(t('profile.messages.profileUpdated'));
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || t('profile.errors.profileUpdateFailed'));
    } finally {
      setPendingAction(null);
    }
  };

  const submitPasswordChange = async (data: PasswordForm) => {
    setErrorMessage('');
    setStatusMessage('');

    if (!data.current_password.trim() || !data.new_password.trim()) {
      setErrorMessage(t('profile.errors.passwordFieldsRequired'));
      return;
    }

    if (data.new_password !== data.confirm_password) {
      setErrorMessage(t('profile.errors.passwordMismatch'));
      return;
    }

    setPendingAction('password');
    try {
      await api.post('/auth/change-password', {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      setStatusMessage(t('profile.messages.passwordUpdated'));
      passwordForm.reset({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || t('profile.errors.passwordUpdateFailed'));
    } finally {
      setPendingAction(null);
    }
  };

  const accountNarration = [
    t('profile.heroTitle'),
    `${t('profile.displayName')}: ${displayName}`,
    `${t('profile.account')}: ${user?.email || t('dashboard.notAvailable')}`,
  ].join(' ');

  const checklistNarration = [
    `${t('profile.checklist.profileTitle')}: ${t('profile.checklist.profileDesc')}`,
    `${t('profile.checklist.emailOtpTitle')}: ${t('profile.checklist.emailOtpDesc')}`,
    `${t('profile.checklist.passwordTitle')}: ${t('profile.checklist.passwordDesc')}`,
    `${t('profile.checklist.sessionCookieTitle')}: ${t('profile.checklist.sessionCookieDesc')}`,
  ].join(' ');

  return (
    <div className="profile-layout">
      <section className="card profile-hero">
        <p className="subtitle">{t('profile.subtitle')}</p>
        <h1 className="headline">{t('profile.heroTitle')}</h1>
        <p className="lead">{t('profile.accountLead')}</p>
        <div className="pill-row">
          <span className="pill">{t('profile.userId')}: {user?.id || t('common.unknown')}</span>
          <span className="pill">{t('profile.displayName')}: {displayName}</span>
          <span className="pill">{t('profile.account')}: {user?.email || t('dashboard.notAvailable')}</span>
        </div>
        <ReadAloudButton text={accountNarration} labelKey="profile.readAccountSummary" />
      </section>

      <section className="profile-grid">
        <article className="card panel-card">
          <div className="panel-card__header">
            <div>
              <h2>{t('profile.profileDetailsTitle')}</h2>
              <p>{t('profile.profileDetailsLead')}</p>
            </div>
          </div>

          <form onSubmit={nameForm.handleSubmit(submitProfile)} className="auth-form">
            <label className="field-label" htmlFor="profile-name">{t('profile.displayName')}</label>
            <input id="profile-name" className="input" placeholder={t('profile.placeholders.fullName')} {...nameForm.register('full_name')} />

            <button className="btn outline" type="submit" disabled={pendingAction !== null}>
              {t('profile.updateProfile')}
            </button>
          </form>

          <form onSubmit={emailForm.handleSubmit(submitEmailChange)} className="auth-form">
            <label className="field-label" htmlFor="profile-email">{t('profile.newEmail')}</label>
            <input id="profile-email" className="input" placeholder={t('profile.placeholders.newEmail')} {...emailForm.register('email')} />

            <label className="field-label" htmlFor="profile-otp">{t('profile.otp')}</label>
            <input id="profile-otp" className="input" placeholder={t('profile.placeholders.otp')} {...emailForm.register('otp')} />

            <div className="inline-row">
              <button className="btn ghost" type="button" onClick={requestOtp} disabled={pendingAction !== null}>
                {t('profile.sendOtp')}
              </button>
              <button className="btn primary" type="submit" disabled={pendingAction !== null}>
                {t('profile.updateEmail')}
              </button>
            </div>
          </form>
        </article>

        <article className="card panel-card">
          <div className="panel-card__header">
            <div>
              <h2>{t('profile.passwordTitle')}</h2>
              <p>{t('profile.passwordLead')}</p>
            </div>
          </div>

          <form onSubmit={passwordForm.handleSubmit(submitPasswordChange)} className="auth-form">
            <label className="field-label" htmlFor="profile-current-password">{t('profile.currentPassword')}</label>
            <input
              id="profile-current-password"
              className="input"
              type="password"
              placeholder={t('profile.placeholders.currentPassword')}
              {...passwordForm.register('current_password')}
            />

            <label className="field-label" htmlFor="profile-new-password">{t('profile.newPassword')}</label>
            <input
              id="profile-new-password"
              className="input"
              type="password"
              placeholder={t('profile.placeholders.newPassword')}
              {...passwordForm.register('new_password')}
            />

            <label className="field-label" htmlFor="profile-confirm-password">{t('profile.confirmPassword')}</label>
            <input
              id="profile-confirm-password"
              className="input"
              type="password"
              placeholder={t('profile.placeholders.confirmPassword')}
              {...passwordForm.register('confirm_password')}
            />

            <button className="btn primary" type="submit" disabled={pendingAction !== null}>
              {t('profile.updatePassword')}
            </button>
          </form>
        </article>
      </section>

      <section className="card profile-checklist">
        <div className="section-title-row">
          <h3>{t('profile.checklistTitle')}</h3>
          <ReadAloudButton text={checklistNarration} labelKey="profile.readChecklist" />
        </div>
        <div className="checklist-grid">
          <div className="checklist-item">
            <strong>{t('profile.checklist.profileTitle')}</strong>
            <span>{t('profile.checklist.profileDesc')}</span>
          </div>
          <div className="checklist-item">
            <strong>{t('profile.checklist.emailOtpTitle')}</strong>
            <span>{t('profile.checklist.emailOtpDesc')}</span>
          </div>
          <div className="checklist-item">
            <strong>{t('profile.checklist.passwordTitle')}</strong>
            <span>{t('profile.checklist.passwordDesc')}</span>
          </div>
          <div className="checklist-item">
            <strong>{t('profile.checklist.sessionCookieTitle')}</strong>
            <span>{t('profile.checklist.sessionCookieDesc')}</span>
          </div>
        </div>
      </section>

      {pendingAction && <LeafLoader variant="panel" label={t('profile.updatingProfile')} />}
      {statusMessage && <div className="success-box">{statusMessage}</div>}
      {errorMessage && <p className="form-error">{errorMessage}</p>}
    </div>
  );
};

export default Profile;
