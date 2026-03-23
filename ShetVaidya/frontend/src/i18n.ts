import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';

const STORAGE_KEY = 'shetvaidya-lang';

const getInitialLanguage = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && ['mr', 'en', 'hi'].includes(saved)) return saved;
  } catch {
    // Ignore storage access errors and fall back to default language.
  }
  return 'mr';
};

i18n.use(initReactI18next).init({
  resources: {
    mr: { translation: mr },
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'mr',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Ignore storage access errors.
  }
});

export default i18n;
