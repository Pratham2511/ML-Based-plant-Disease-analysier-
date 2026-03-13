import LeafLoader from './LeafLoader';
import { useTranslation } from 'react-i18next';

const AppSplash = () => {
  const { t } = useTranslation();

  return (
    <div className="app-splash" role="status" aria-live="polite">
      <div className="app-splash__panel">
        <img src="/app-icon.svg" alt={t('app.iconAlt')} className="app-splash__icon" />
        <h1>{t('app.brandName')}</h1>
        <p>{t('app.splashInitializing')}</p>
        <LeafLoader label={t('app.splashBooting')} variant="inline" />
      </div>
    </div>
  );
};

export default AppSplash;
