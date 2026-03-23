import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatLocalizedNumber } from '../utils/localization';

const Introduction = () => {
  const { t, i18n } = useTranslation();
  const formattedLastScanConfidence = formatLocalizedNumber(93.6, i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const formatFeatureIndex = (index: number) =>
    formatLocalizedNumber(index, i18n.language, {
      minimumIntegerDigits: 2,
      useGrouping: false,
    });

  return (
    <div className="landing-layout">
      <section className="hero-shell">
        <div className="hero-content">
          <p className="subtitle">{t('intro.subtitle')}</p>
          <h1 className="headline">{t('intro.title')}</h1>
          <p className="lead">शेतवैद्य — पिकाचं दुखणं ओळखणारा.</p>
          <p className="lead">
            {t('intro.leadOne')}
          </p>
          <p className="lead">
            {t('intro.leadTwo')}
          </p>

          <div className="hero-actions">
            <Link className="btn primary" to="/dashboard">
              {t('intro.primaryAction')}
            </Link>
            <Link className="btn outline" to="/dashboard">
              {t('intro.secondaryAction')}
            </Link>
          </div>

          <div className="hero-chip-row">
            <span className="pill">{t('intro.chips.aiDetection')}</span>
            <span className="pill">{t('intro.chips.medicineAuth')}</span>
            <span className="pill">{t('intro.chips.locationInsights')}</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden>
          <div className="hero-visual__glass">
            <p>{t('intro.liveMonitoring')}</p>
            <strong>{t('intro.fieldRisk')}</strong>
            <span>{t('intro.lastScan', { value: formattedLastScanConfidence })}</span>
          </div>
        </div>
      </section>

      <section className="card section-block">
        <div className="landing-video-grid">
          <div>
            <video
              autoPlay
              muted
              loop
              playsInline
              className="landing-video"
              style={{ width: '100%', borderRadius: '16px', display: 'block' }}
            >
              <source src="/shetvaidya_landing.webm" type="video/webm" />
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="landing-video-copy">
            <h2 className="headline" style={{ marginBottom: '16px', fontSize: '2rem' }}>
              {t('intro.videoHeadline', 'Disease Spreads Faster Than You Think.')}
            </h2>
            <p className="lead" style={{ marginBottom: '12px' }}>
              {t(
                'intro.videoLeadOne',
                'Early field signs are easy to miss during routine rounds. ShetVaidya helps you act before infection spreads across the plot.'
              )}
            </p>
            <p className="lead" style={{ marginBottom: '16px' }}>
              {t(
                'intro.videoLeadTwo',
                'Use AI crop checks, medicine verification, and district intelligence together to make faster, more confident farm decisions.'
              )}
            </p>
            <Link className="btn primary" to="/dashboard">
              {t('intro.videoAction', 'Start Crop Check')}
            </Link>
          </div>
        </div>
      </section>

      <section className="card section-block">
        <div className="section-title-row">
          <h2>{t('intro.whyTitle')}</h2>
          <span className="pill">{t('intro.whyPill')}</span>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <div className="feature-icon">{formatFeatureIndex(1)}</div>
            <h3>{t('intro.features.aiTitle')}</h3>
            <p>{t('intro.features.aiDesc')}</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon">{formatFeatureIndex(2)}</div>
            <h3>{t('intro.features.authTitle')}</h3>
            <p>{t('intro.features.authDesc')}</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon">{formatFeatureIndex(3)}</div>
            <h3>{t('intro.features.locationTitle')}</h3>
            <p>{t('intro.features.locationDesc')}</p>
          </article>
        </div>
      </section>

      <section className="card section-block">
        <div className="section-title-row">
          <h2>{t('intro.usersTitle')}</h2>
          <span className="pill">{t('intro.usersPill')}</span>
        </div>

        <div className="impact-grid">
          <article className="impact-card">
            <strong>{t('intro.users.farmersTitle')}</strong>
            <p>{t('intro.users.farmersDesc')}</p>
          </article>
          <article className="impact-card">
            <strong>{t('intro.users.researchTitle')}</strong>
            <p>{t('intro.users.researchDesc')}</p>
          </article>
          <article className="impact-card">
            <strong>{t('intro.users.advisorsTitle')}</strong>
            <p>{t('intro.users.advisorsDesc')}</p>
          </article>
        </div>

        <div className="closing-cta">
          <h3>{t('intro.closingTitle')}</h3>
          <div className="hero-actions">
            <Link className="btn primary" to="/dashboard">
              {t('intro.primaryAction')}
            </Link>
            <Link className="btn ghost" to="/history">
              {t('nav.scanHistory')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Introduction;
