import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import api from '../lib/api';
import { useAuth } from '../components/AuthContext';
import LeafLoader from '../components/LeafLoader';
import ReadAloudButton from '../components/ReadAloudButton';

type NameForm = { full_name: string };

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

  const displayName = nameForm.watch('full_name') || user?.full_name || t('dashboard.notAvailable');

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

  const accountNarration = [
    t('profile.heroTitle'),
    `${t('profile.displayName')}: ${displayName}`,
    `${t('profile.account')}: ${user?.email || t('dashboard.notAvailable')}`,
    t('profile.authProviderNarration'),
  ].join(' ');

  const checklistNarration = [
    `${t('profile.checklist.profileTitle')}: ${t('profile.checklist.profileDesc')}`,
    `${t('profile.checklist.sessionCookieTitle')}: ${t('profile.checklist.sessionCookieDesc')}`,
    t('profile.googleAccountDesc'),
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
          <span className="pill">{t('profile.authProvider')}</span>
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
            <strong>{t('profile.checklist.sessionCookieTitle')}</strong>
            <span>{t('profile.checklist.sessionCookieDesc')}</span>
          </div>
          <div className="checklist-item">
            <strong>{t('profile.googleAccountTitle')}</strong>
            <span>{t('profile.googleAccountDesc')}</span>
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
