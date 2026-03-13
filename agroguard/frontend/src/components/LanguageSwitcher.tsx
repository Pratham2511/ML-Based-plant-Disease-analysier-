import { useTranslation } from 'react-i18next';

const LANGUAGE_OPTIONS = [
  { code: 'mr', labelKey: 'language.marathi' },
  { code: 'en', labelKey: 'language.english' },
  { code: 'hi', labelKey: 'language.hindi' },
];

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  return (
    <div className="lang-switcher" role="group" aria-label={t('language.label')}>
      <span className="lang-switcher__label">{t('language.label')}</span>
      <div className="lang-switcher__options">
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.code}
            type="button"
            className={`lang-switcher__btn ${i18n.language.startsWith(option.code) ? 'active' : ''}`}
            onClick={() => i18n.changeLanguage(option.code)}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
