import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import FarmSlideshow from '../components/FarmSlideshow';
import { MAHARASHTRA_DISTRICTS, localizeDistrictName } from '../utils/districtLocalization';

type OfficeRecord = {
  address: string;
  phone: string;
};

type SchemeRecord = {
  key: string;
  link: string;
};

const SCHEMES: SchemeRecord[] = [
  { key: 'pmfby', link: 'https://pmfby.gov.in' },
  { key: 'pmKisan', link: 'https://pmkisan.gov.in' },
  { key: 'soilHealthCard', link: 'https://soilhealth.dac.gov.in' },
  { key: 'pmksy', link: 'https://pmksy.gov.in' },
  { key: 'mahadbt', link: 'https://mahadbt.maharashtra.gov.in' },
  { key: 'namoShetkari', link: 'https://krishi.maharashtra.gov.in' },
];

const KrushiVibhag = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const [selectedDistrict, setSelectedDistrict] = useState<string>('Pune');

  const officeDirectory = useMemo<Record<string, OfficeRecord>>(
    () => ({
      Pune: {
        address: t('krushiVibhag.officeData.Pune.address'),
        phone: t('krushiVibhag.officeData.Pune.phone'),
      },
      Nashik: {
        address: t('krushiVibhag.officeData.Nashik.address'),
        phone: t('krushiVibhag.officeData.Nashik.phone'),
      },
      Ahmednagar: {
        address: t('krushiVibhag.officeData.Ahmednagar.address'),
        phone: t('krushiVibhag.officeData.Ahmednagar.phone'),
      },
      Aurangabad: {
        address: t('krushiVibhag.officeData.Aurangabad.address'),
        phone: t('krushiVibhag.officeData.Aurangabad.phone'),
      },
      Nagpur: {
        address: t('krushiVibhag.officeData.Nagpur.address'),
        phone: t('krushiVibhag.officeData.Nagpur.phone'),
      },
      Kolhapur: {
        address: t('krushiVibhag.officeData.Kolhapur.address'),
        phone: t('krushiVibhag.officeData.Kolhapur.phone'),
      },
    }),
    [t]
  );

  const slideshowSlides = useMemo(
    () => [
      {
        src: '/plant-images/sugarcane.jpg',
        caption: t('krushiVibhag.photoCaptionSoon'),
      },
      {
        src: '/plant-images/tomato.jpg',
        caption: t('krushiVibhag.photoCaptionSoon'),
      },
      {
        src: '/plant-images/grapes.jpg',
        caption: t('krushiVibhag.photoCaptionSoon'),
      },
      {
        src: '/plant-images/cotton.jpg',
        caption: t('krushiVibhag.photoCaptionSoon'),
      },
      {
        src: '/plant-images/rice.jpg',
        caption: t('krushiVibhag.photoCaptionSoon'),
      },
    ],
    [t]
  );

  const selectedOffice = officeDirectory[selectedDistrict];
  const mapsQuery = encodeURIComponent(`Krushi Vibhag ${selectedDistrict} Maharashtra`);

  return (
    <div className="krushi-vibhag-layout">
      <section className="card krushi-hero">
        <div className="krushi-hero__copy">
          <span className="pill">{t('krushiVibhag.govBadge')}</span>
          <p className="subtitle">{t('krushiVibhag.title')}</p>
          <h1 className="headline">{t('krushiVibhag.heroHeading')}</h1>
          <p className="lead">{t('krushiVibhag.heroSubtext')}</p>
        </div>
        <FarmSlideshow
          slides={slideshowSlides}
          title={t('krushiVibhag.slideshowTitle')}
          prevLabel={t('krushiVibhag.slideshowPrev')}
          nextLabel={t('krushiVibhag.slideshowNext')}
          dotLabel={t('krushiVibhag.slideshowDots')}
        />
        <p className="lead">{t('krushiVibhag.photosNotice')}</p>
      </section>

      <section className="card section-block">
        <div className="section-title-row">
          <h2>{t('krushiVibhag.aboutTitle')}</h2>
        </div>
        <p className="lead">{t('krushiVibhag.aboutLead')}</p>
        <p className="lead">{t('krushiVibhag.aboutBody')}</p>

        <div className="krushi-three-grid">
          <article className="feature-card">
            <div className="feature-icon">DO</div>
            <h3>{t('krushiVibhag.roles.districtOfficer.title')}</h3>
            <p>{t('krushiVibhag.roles.districtOfficer.desc')}</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">TS</div>
            <h3>{t('krushiVibhag.roles.talukaSupervisor.title')}</h3>
            <p>{t('krushiVibhag.roles.talukaSupervisor.desc')}</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">VEW</div>
            <h3>{t('krushiVibhag.roles.villageWorker.title')}</h3>
            <p>{t('krushiVibhag.roles.villageWorker.desc')}</p>
          </article>
        </div>
      </section>

      <section className="card section-block">
        <div className="section-title-row">
          <h2>{t('krushiVibhag.helpTitle')}</h2>
        </div>
        <div className="krushi-benefits-grid">
          <article className="impact-card">
            <strong>{t('krushiVibhag.benefits.soilTesting.title')}</strong>
            <p>{t('krushiVibhag.benefits.soilTesting.desc')}</p>
          </article>
          <article className="impact-card">
            <strong>{t('krushiVibhag.benefits.seedSubsidy.title')}</strong>
            <p>{t('krushiVibhag.benefits.seedSubsidy.desc')}</p>
          </article>
          <article className="impact-card">
            <strong>{t('krushiVibhag.benefits.insurance.title')}</strong>
            <p>{t('krushiVibhag.benefits.insurance.desc')}</p>
          </article>
          <article className="impact-card">
            <strong>{t('krushiVibhag.benefits.disaster.title')}</strong>
            <p>{t('krushiVibhag.benefits.disaster.desc')}</p>
          </article>
        </div>
      </section>

      <section className="card section-block">
        <div className="section-title-row">
          <h2>{t('krushiVibhag.schemesTitle')}</h2>
        </div>
        <div className="krushi-schemes-grid">
          {SCHEMES.map((scheme) => (
            <article key={scheme.key} className="krushi-scheme-card">
              <header>
                <h3>{t(`krushiVibhag.schemes.${scheme.key}.name`)}</h3>
              </header>
              <div className="krushi-scheme-card__body">
                <p>{t(`krushiVibhag.schemes.${scheme.key}.description`)}</p>
                <span className="pill">{t(`krushiVibhag.schemes.${scheme.key}.eligibility`)}</span>
                <a
                  className="btn outline"
                  href={scheme.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('krushiVibhag.learnMore')}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card section-block">
        <div className="section-title-row">
          <h2>{t('krushiVibhag.contactTitle')}</h2>
        </div>

        <div className="krushi-office-grid">
          <div className="krushi-office-selector">
            <label className="field-label" htmlFor="krushi-district-select">
              {t('krushiVibhag.selectDistrict')}
            </label>
            <select
              id="krushi-district-select"
              className="input"
              value={selectedDistrict}
              onChange={(event) => setSelectedDistrict(event.target.value)}
            >
              {MAHARASHTRA_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {officeDirectory[district]
                    ? localizeDistrictName(district, language)
                    : `${localizeDistrictName(district, language)} (${t('krushiVibhag.districtComingSoonTag')})`}
                </option>
              ))}
            </select>
            <p className="panel-muted">{t('krushiVibhag.remainingDistrictsNotice')}</p>
          </div>

          <article className="krushi-office-card">
            <h3>
              {t('krushiVibhag.officeHeading', {
                district: localizeDistrictName(selectedDistrict, language),
              })}
            </h3>
            {selectedOffice ? (
              <>
                <p>
                  <strong>{t('krushiVibhag.addressLabel')}:</strong> {selectedOffice.address}
                </p>
                <p>
                  <strong>{t('krushiVibhag.phoneLabel')}:</strong>{' '}
                  <a href={`tel:${selectedOffice.phone}`}>{selectedOffice.phone}</a>
                </p>
              </>
            ) : (
              <p>{t('krushiVibhag.officeUnavailable')}</p>
            )}
            <p>
              <strong>{t('krushiVibhag.officeHoursLabel')}:</strong> {t('krushiVibhag.officeHours')}
            </p>

            <a
              className="btn primary"
              href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
              target="_blank"
              rel="noreferrer"
            >
              {t('krushiVibhag.getDirections')}
            </a>
          </article>
        </div>
      </section>

      <section className="card krushi-helpline">
        <h2>{t('krushiVibhag.helplineTitle')}</h2>
        <p>
          <a href="tel:18001801551">{t('krushiVibhag.helplines.kisanCallCenter')}</a>
        </p>
        <p>
          <a href="tel:18002334000">{t('krushiVibhag.helplines.stateLine')}</a>
        </p>
        <p className="lead">{t('krushiVibhag.helplineHours')}</p>
      </section>
    </div>
  );
};

export default KrushiVibhag;
