import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import api from '../lib/api';
import { useAuth } from '../components/AuthContext';
import LeafLoader from '../components/LeafLoader';
import ReadAloudButton from '../components/ReadAloudButton';
import AddFarmModal from '../components/AddFarmModal';
import { useFarmContext, type Farm } from '../context/FarmContext';

type NameForm = { full_name: string };

const Profile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { farms, addFarm, updateFarm, deleteFarm, setActiveFarm, loading: farmsLoading } = useFarmContext();
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);

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
      <section className="card farms-section">
        <div className="section-title-row">
          <h2>{t('farms.title')}</h2>
          <button
            type="button"
            className="btn primary btn--compact"
            onClick={() => {
              setEditingFarm(null);
              setShowFarmModal(true);
            }}
          >
            + {t('farms.addFarm')}
          </button>
        </div>

        {farmsLoading ? <LeafLoader variant="panel" label={t('common.loading')} /> : null}

        {farms.length === 0 ? <p className="panel-muted">{t('farms.noFarms')}</p> : null}

        <div className="farms-grid">
          {farms.map((farm) => (
            <article key={farm.id} className={`farm-card ${farm.isActive ? 'is-active' : ''}`}>
              <strong>{farm.isActive ? `✅ ${farm.name}` : farm.name}</strong>
              <span>{farm.crop} · {farm.areaAcres ?? '-'} {t('farms.acres')}</span>
              <span>{farm.district || '-'}</span>
              <span>{farm.soilType ? t(`farms.soilTypes.${farm.soilType}`) : '-'}</span>
              <div className="inline-row">
                <button
                  type="button"
                  className="btn outline btn--compact"
                  onClick={() => {
                    setEditingFarm(farm);
                    setShowFarmModal(true);
                  }}
                >
                  {t('farms.editFarm')}
                </button>
                {!farm.isActive ? (
                  <button type="button" className="btn ghost btn--compact" onClick={() => setActiveFarm(farm)}>
                    {t('farms.setActive')}
                  </button>
                ) : (
                  <span className="pill">{t('farms.active')}</span>
                )}
                <button
                  type="button"
                  className="btn ghost btn--compact"
                  onClick={async () => {
                    if (!window.confirm(t('farms.deleteConfirm'))) return;
                    await deleteFarm(farm.id);
                  }}
                >
                  {t('farms.deleteFarm')}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

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

      <AddFarmModal
        isOpen={showFarmModal}
        onClose={() => setShowFarmModal(false)}
        initialFarm={editingFarm}
        onSave={async (farmPayload) => {
          if (editingFarm) {
            await updateFarm(editingFarm.id, farmPayload);
            return;
          }
          await addFarm(farmPayload);
        }}
      />
    </div>
  );
};

export default Profile;
