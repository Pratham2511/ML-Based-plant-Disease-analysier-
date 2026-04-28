import { useForm } from 'react-hook-form';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import api from '../lib/api';
import { useAuth } from '../components/AuthContext';
import LeafLoader from '../components/LeafLoader';
import ReadAloudButton from '../components/ReadAloudButton';
import AddFarmModal from '../components/AddFarmModal';
import { useFarmContext, type Farm } from '../context/FarmContext';

type NameForm = { full_name: string };

const Profile = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { farms, addFarm, updateFarm, deleteFarm, setActiveFarm, loading: farmsLoading } = useFarmContext();
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [mobileNameDraft, setMobileNameDraft] = useState('');

  const nameForm = useForm<NameForm>({
    defaultValues: {
      full_name: user?.full_name || '',
    },
  });

  const authUser = (user as (typeof user & { picture?: string | null; name?: string | null }) | null);
  const fallbackName = authUser?.name || user?.full_name || user?.email?.split('@')[0] || '';
  const displayName = (nameForm.watch('full_name') || fallbackName || t('dashboard.notAvailable')).trim();
  const avatarUrl = (authUser?.picture || user?.picture_url || '').trim();
  const avatarInitial = ((fallbackName || user?.email || '?').trim().charAt(0) || '?').toUpperCase();

  const languageOptions = [
    { code: 'mr', label: t('language.marathi') },
    { code: 'en', label: t('language.english') },
    { code: 'hi', label: t('language.hindi') },
  ];

  const updateProfileName = async (rawName: string) => {
    setErrorMessage('');
    setStatusMessage('');

    const fullName = rawName.trim();
    if (!fullName) {
      setErrorMessage(t('profile.errors.fullNameRequired'));
      return false;
    }

    setPendingAction('profile');
    try {
      await api.post('/auth/profile', { full_name: fullName });
      nameForm.setValue('full_name', fullName, { shouldDirty: false });
      setStatusMessage(t('profile.messages.profileUpdated'));
      return true;
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.detail || t('profile.errors.profileUpdateFailed'));
      return false;
    } finally {
      setPendingAction(null);
    }
  };

  const submitProfile = async (data: NameForm) => {
    await updateProfileName(data.full_name);
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

  const joinedDateLabel = useMemo(() => {
    const earliestFarm = [...farms]
      .filter((farm) => farm.createdAt)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

    if (!earliestFarm?.createdAt) {
      return t('profile.mobile.notAvailable');
    }

    return new Date(earliestFarm.createdAt).toLocaleDateString(i18n.language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [farms, i18n.language, t]);

  const handleNotificationsPermissionTap = async () => {
    setStatusMessage('');
    setErrorMessage('');

    if (!Capacitor.isNativePlatform()) {
      setStatusMessage(t('profile.notificationsComingSoon'));
      return;
    }

    setPendingAction('notifications');
    try {
      const current = await LocalNotifications.checkPermissions();
      const resolved = current.display === 'granted'
        ? current
        : await LocalNotifications.requestPermissions();

      if (resolved.display === 'granted') {
        setStatusMessage(t('profile.notificationsEnabled'));
      } else {
        setErrorMessage(t('profile.notificationsPermissionDenied'));
      }
    } catch {
      setErrorMessage(t('profile.notificationsPermissionError'));
    } finally {
      setPendingAction(null);
    }
  };

  const handlePersonalInfoOpen = () => {
    setMobileNameDraft(displayName === t('dashboard.notAvailable') ? '' : displayName);
    setShowPersonalInfo(true);
  };

  const handleSavePersonalInfo = async () => {
    const updated = await updateProfileName(mobileNameDraft);
    if (updated) {
      setShowPersonalInfo(false);
    }
  };

  const handleLanguageSelect = (code: string) => {
    i18n.changeLanguage(code);
    setShowLanguagePicker(false);
  };

  return (
    <div className="profile-layout">
      <section className="profile-mobile-shell">
        <header className="profile-mobile-glass-header">
          <p className="profile-mobile-title">{t('profile.mobile.title')}</p>
        </header>

        <section className="profile-mobile-hero card">
          <div className="profile-avatar-container">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={t('profile.mobile.avatarAlt')}
                className="profile-avatar-img"
                onError={(event) => {
                  (event.target as HTMLImageElement).src = '/assets/shetvaidya-icon.svg';
                }}
              />
            ) : (
              <div className="profile-avatar-placeholder">
                <span className="profile-avatar-initials">{avatarInitial}</span>
              </div>
            )}
          </div>
          <h2>{displayName}</h2>
          <p>{user?.email || t('dashboard.notAvailable')}</p>

          <div className="profile-mobile-meta-grid">
            <article className="profile-mobile-meta-card">
              <span>{t('profile.mobile.statusLabel')}</span>
              <strong className="profile-mobile-status-pill">{t('profile.mobile.statusActive')}</strong>
            </article>
            <article className="profile-mobile-meta-card">
              <span>{t('profile.mobile.joinedLabel')}</span>
              <strong>{joinedDateLabel}</strong>
            </article>
          </div>
        </section>

        <section className="profile-mobile-group card">
          <h3>{t('profile.mobile.accountSettings')}</h3>
          <button type="button" className="profile-mobile-row" onClick={handlePersonalInfoOpen}>
            <span className="profile-mobile-row-icon">👤</span>
            <span className="profile-mobile-row-copy">
              <strong>{t('profile.mobile.personalInfoTitle')}</strong>
              <small>{t('profile.mobile.personalInfoSubtitle')}</small>
            </span>
            <span className="profile-mobile-chevron">›</span>
          </button>
          <button type="button" className="profile-mobile-row" onClick={handleNotificationsPermissionTap}>
            <span className="profile-mobile-row-icon">🔔</span>
            <span className="profile-mobile-row-copy">
              <strong>{t('profile.mobile.notificationsTitle')}</strong>
              <small>{t('profile.mobile.notificationsSubtitle')}</small>
            </span>
            <span className="profile-mobile-chevron">›</span>
          </button>
          <button type="button" className="profile-mobile-row" onClick={() => setShowLanguagePicker(true)}>
            <span className="profile-mobile-row-icon">🌐</span>
            <span className="profile-mobile-row-copy">
              <strong>{t('profile.mobile.languageTitle')}</strong>
              <small>{t('profile.mobile.languageSubtitle')}</small>
            </span>
            <span className="profile-mobile-chevron">›</span>
          </button>
        </section>

        <section className="profile-mobile-group card">
          <h3>{t('profile.mobile.supportPrivacy')}</h3>
          <button type="button" className="profile-mobile-row" onClick={() => setShowHelpModal(true)}>
            <span className="profile-mobile-row-icon">🆘</span>
            <span className="profile-mobile-row-copy">
              <strong>{t('profile.mobile.helpTitle')}</strong>
              <small>{t('profile.mobile.helpSubtitle')}</small>
            </span>
            <span className="profile-mobile-chevron">›</span>
          </button>
          <button
            type="button"
            className="profile-mobile-row"
            onClick={() => window.open('/privacy', '_blank', 'noopener,noreferrer')}
          >
            <span className="profile-mobile-row-icon">🔐</span>
            <span className="profile-mobile-row-copy">
              <strong>{t('profile.mobile.privacyTitle')}</strong>
              <small>{t('profile.mobile.privacySubtitle')}</small>
            </span>
            <span className="profile-mobile-chevron">›</span>
          </button>
        </section>

        <section className="card farms-section" style={{ margin: '0 16px 16px' }}>
          <div className="section-title-row">
            <h3>{t('farms.title')}</h3>
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

        <section className="profile-mobile-actions">
          <button
            type="button"
            className="btn profile-mobile-logout"
            onClick={logout}
            disabled={pendingAction !== null}
          >
            {t('nav.logout')}
          </button>
          <p className="profile-mobile-version">Version 2.4.0-Beta</p>
        </section>
      </section>

      <div className="profile-desktop-content">
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
      </div>

      {showPersonalInfo && (
        <div className="profile-mobile-sheet-backdrop" role="presentation" onClick={() => setShowPersonalInfo(false)}>
          <section className="profile-mobile-sheet card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>{t('profile.mobile.personalInfoTitle')}</h3>
            <label className="field-label" htmlFor="profile-mobile-name">{t('profile.displayName')}</label>
            <input
              id="profile-mobile-name"
              className="input"
              value={mobileNameDraft}
              onChange={(event) => setMobileNameDraft(event.target.value)}
              placeholder={t('profile.placeholders.fullName')}
            />
            <div className="inline-row">
              <button type="button" className="btn ghost" onClick={() => setShowPersonalInfo(false)}>
                {t('common.close')}
              </button>
              <button type="button" className="btn primary" onClick={handleSavePersonalInfo} disabled={pendingAction !== null}>
                {t('profile.updateProfile')}
              </button>
            </div>
          </section>
        </div>
      )}

      {showLanguagePicker && (
        <div className="profile-mobile-sheet-backdrop" role="presentation" onClick={() => setShowLanguagePicker(false)}>
          <section className="profile-mobile-sheet card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>{t('profile.languagePickerTitle')}</h3>
            <div className="profile-mobile-lang-options">
              {languageOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={`profile-mobile-lang-option ${i18n.language.split('-')[0] === option.code ? 'is-active' : ''}`}
                  onClick={() => handleLanguageSelect(option.code)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {showHelpModal && (
        <div className="profile-mobile-sheet-backdrop" role="presentation" onClick={() => setShowHelpModal(false)}>
          <section className="profile-mobile-sheet card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>{t('profile.helpTitle')}</h3>
            <p>{t('profile.helpBody')}</p>
            <button type="button" className="btn primary" onClick={() => setShowHelpModal(false)}>
              {t('common.close')}
            </button>
          </section>
        </div>
      )}

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
