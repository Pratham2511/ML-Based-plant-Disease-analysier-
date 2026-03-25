import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export type SchemeStat = {
  label: string;
  value: string;
  icon: string;
};

export type SchemePopupData = {
  howItHelps: string[];
  howItHelpsMr: string[];
  howItHelpsHi?: string[];
  realExample: string;
  realExampleMr: string;
  realExampleHi?: string;
  steps: string[];
  stepsMr: string[];
  stepsHi?: string[];
  visualStats: SchemeStat[];
};

export type SchemeData = {
  id: string;
  name: string;
  nameMr: string;
  nameHi: string;
  tagline: string;
  taglineMr: string;
  taglineHi: string;
  description: string;
  eligibility: string;
  url: string;
  icon: string;
  color: string;
  benefitAmount: string;
  benefitAmountMr: string;
  benefitAmountHi: string;
  popup: SchemePopupData;
};

type SchemePopupProps = {
  scheme: SchemeData;
  language: string;
  onClose: () => void;
};

const getLocalized = (language: string, english: string, marathi: string, hindi?: string) => {
  const base = language.split('-')[0];
  if (base === 'mr') return marathi;
  if (base === 'hi') return hindi || english;
  return english;
};

const getLocalizedList = (language: string, english: string[], marathi: string[], hindi?: string[]) => {
  const base = language.split('-')[0];
  if (base === 'mr') return marathi;
  if (base === 'hi') return hindi || english;
  return english;
};

const SchemePopup = ({ scheme, language, onClose }: SchemePopupProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const localizedName = getLocalized(language, scheme.name, scheme.nameMr, scheme.nameHi);
  const localizedTagline = getLocalized(language, scheme.tagline, scheme.taglineMr, scheme.taglineHi);
  const localizedBenefit = getLocalized(language, scheme.benefitAmount, scheme.benefitAmountMr, scheme.benefitAmountHi);

  const localizedHowItHelps = useMemo(
    () => getLocalizedList(language, scheme.popup.howItHelps, scheme.popup.howItHelpsMr, scheme.popup.howItHelpsHi),
    [language, scheme.popup.howItHelps, scheme.popup.howItHelpsHi, scheme.popup.howItHelpsMr]
  );

  const localizedRealStory = getLocalized(
    language,
    scheme.popup.realExample,
    scheme.popup.realExampleMr,
    scheme.popup.realExampleHi
  );

  const localizedSteps = useMemo(
    () => getLocalizedList(language, scheme.popup.steps, scheme.popup.stepsMr, scheme.popup.stepsHi),
    [language, scheme.popup.steps, scheme.popup.stepsHi, scheme.popup.stepsMr]
  );

  return (
    <div className="scheme-popup-backdrop" role="presentation" onClick={onClose}>
      <div className="scheme-popup" role="dialog" aria-modal="true" aria-label={localizedName} onClick={(event) => event.stopPropagation()}>
        <header className={`scheme-popup__header scheme-popup__header--${scheme.id}`}>
          <div className="scheme-popup__title">
            <span className="scheme-popup__icon" aria-hidden>
              {scheme.icon}
            </span>
            <div>
              <h3>{localizedName}</h3>
              <p>{localizedTagline}</p>
            </div>
          </div>
          <button type="button" className="scheme-popup__close" onClick={onClose} aria-label={t('krushiVibhag.close')}>
            x
          </button>
        </header>

        <div className="scheme-popup__content">
          <section className="scheme-popup__section">
            <h4>{t('krushiVibhag.howItHelps')}</h4>
            <ul className="scheme-popup__bullet-list">
              {localizedHowItHelps.map((point, index) => (
                <li key={`${scheme.id}-help-${index}`}>{point}</li>
              ))}
            </ul>
          </section>

          <section className="scheme-popup__section">
            <h4>{t('krushiVibhag.atAGlance')}</h4>
            <div className="scheme-popup__stats-grid">
              {scheme.popup.visualStats.map((stat, index) => (
                <article key={`${scheme.id}-stat-${index}`} className="scheme-popup__stat-card">
                  <span className="scheme-popup__stat-icon" aria-hidden>
                    {stat.icon}
                  </span>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </article>
              ))}
              <article className="scheme-popup__stat-card">
                <span className="scheme-popup__stat-icon" aria-hidden>
                  💵
                </span>
                <strong>{localizedBenefit}</strong>
                <span>{t('krushiVibhag.benefitAmountLabel')}</span>
              </article>
            </div>
          </section>

          <section className="scheme-popup__section scheme-popup__story">
            <h4>{t('krushiVibhag.realStory')}</h4>
            <p>{localizedRealStory}</p>
          </section>

          <section className="scheme-popup__section">
            <h4>{t('krushiVibhag.howToApply')}</h4>
            <ol className="scheme-popup__steps">
              {localizedSteps.map((step, index) => (
                <li key={`${scheme.id}-step-${index}`}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="scheme-popup__actions">
            <button type="button" className="btn primary" onClick={() => window.open(scheme.url, '_blank')}>
              {t('krushiVibhag.visitWebsite')}
            </button>
            <button type="button" className="btn ghost" onClick={onClose}>
              {t('krushiVibhag.close')}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SchemePopup;
