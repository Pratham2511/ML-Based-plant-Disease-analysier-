import { useTranslation } from 'react-i18next';

import type { SoilReport } from '../types/areaIntelligence';
import ReadAloudButton from './ReadAloudButton';
import { localizeAgricultureText } from '../utils/localization';

type SoilReportCardProps = {
  soilReport: SoilReport;
  recommendations: string[];
};

const SoilReportCard = ({ soilReport, recommendations }: SoilReportCardProps) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const localizeText = (value: string) => localizeAgricultureText(value, language);

  const localizedRecommendations = recommendations.map((advice) => localizeText(advice));

  const readAloudText = [
    `${t('area.fields.soilType')}: ${localizeText(soilReport.soil_type)}`,
    `${t('area.fields.phLevel')}: ${localizeText(soilReport.ph_level)}`,
    `${t('area.fields.nitrogen')}: ${localizeText(soilReport.nitrogen_level)}`,
    `${t('area.fields.phosphorus')}: ${localizeText(soilReport.phosphorus_level)}`,
    `${t('area.fields.potassium')}: ${localizeText(soilReport.potassium_level)}`,
    `${t('area.fields.organicMatter')}: ${localizeText(soilReport.organic_matter)}`,
    `${t('area.fields.moistureRetention')}: ${localizeText(soilReport.moisture_retention)}`,
    `${t('area.fields.drainageCapacity')}: ${localizeText(soilReport.drainage_capacity)}`,
    ...localizedRecommendations,
  ].join('. ');

  return (
    <section className="card soil-report-card">
      <div className="section-title-row">
        <h2>{t('area.soilTitle')}</h2>
        <ReadAloudButton text={readAloudText} labelKey="area.readSoilAdvice" />
      </div>

      <div className="soil-report-grid">
        <div>
          <span className="label-muted">{t('area.fields.soilType')}</span>
          <strong>{localizeText(soilReport.soil_type)}</strong>
        </div>
        <div>
          <span className="label-muted">{t('area.fields.phLevel')}</span>
          <strong>{localizeText(soilReport.ph_level)}</strong>
        </div>
        <div>
          <span className="label-muted">{t('area.fields.nitrogen')}</span>
          <strong>{localizeText(soilReport.nitrogen_level)}</strong>
        </div>
        <div>
          <span className="label-muted">{t('area.fields.phosphorus')}</span>
          <strong>{localizeText(soilReport.phosphorus_level)}</strong>
        </div>
        <div>
          <span className="label-muted">{t('area.fields.potassium')}</span>
          <strong>{localizeText(soilReport.potassium_level)}</strong>
        </div>
        <div>
          <span className="label-muted">{t('area.fields.organicMatter')}</span>
          <strong>{localizeText(soilReport.organic_matter)}</strong>
        </div>
        <div>
          <span className="label-muted">{t('area.fields.moistureRetention')}</span>
          <strong>{localizeText(soilReport.moisture_retention)}</strong>
        </div>
        <div>
          <span className="label-muted">{t('area.fields.drainageCapacity')}</span>
          <strong>{localizeText(soilReport.drainage_capacity)}</strong>
        </div>
      </div>

      <div className="soil-recommendations">
        <h3>{t('area.soilImprovementTitle')}</h3>
        <ul>
          {localizedRecommendations.map((advice) => (
            <li key={advice}>{advice}</li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default SoilReportCard;
