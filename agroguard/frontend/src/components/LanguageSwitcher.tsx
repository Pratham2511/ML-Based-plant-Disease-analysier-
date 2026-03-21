import { useTranslation } from 'react-i18next';

const LANGUAGE_OPTIONS = [
  { code: 'mr', labelKey: 'language.marathi' },
  { code: 'en', labelKey: 'language.english' },
  { code: 'hi', labelKey: 'language.hindi' },
];

const LanguageSwitcher = ({ compactMobile = false }: { compactMobile?: boolean }) => {
  const { i18n, t } = useTranslation();

  return (
    <div className={`lang-switcher ${compactMobile ? 'lang-switcher--compact-mobile' : ''}`} role="group" aria-label={t('language.label')}>
      <span className="lang-switcher__label">{t('language.label')}</span>
      <div className="lang-switcher__options">
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.code}
            type="button"
            className={`lang-switcher__btn text-xs px-2 py-1 md:px-[7px] md:py-[6px] md:text-[0.76rem] ${i18n.language.startsWith(option.code) ? 'active' : ''}`}
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
