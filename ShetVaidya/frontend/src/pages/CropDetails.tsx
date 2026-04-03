import { useTranslation } from 'react-i18next';

import type { CropRecommendation } from '../types/areaIntelligence';
import { localizeAgricultureText } from '../utils/localization';

type CropDetailsProps = {
  crop: CropRecommendation;
};

const CropDetails = ({ crop }: CropDetailsProps) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const icon = {
    scientificName: '🧪',
    soil: '🪨',
    temperature: '🌡️',
    rainfall: '🌧️',
    season: '🗓️',
    plantingMethod: '🌱',
    seedRate: '🌾',
    growthDuration: '⏳',
    fertilizer: '🧴',
    irrigationSchedule: '💧',
    irrigationMethod: '🚿',
    yield: '🌾',
    marketPriceRange: '💰',
    commonDiseases: '🦠',
    diseasePrevention: '🛡️',
  } as const;

  return (
    <div className="crop-details-grid">
      <div className="crop-detail-item">
        <span className="label-muted">{icon.scientificName} {t('area.fields.scientificName')}</span>
        <strong>{localizeAgricultureText(crop.scientific_name, language)}</strong>
      </div>
      <div className="crop-detail-item">
        <span className="label-muted">{icon.soil} {t('area.fields.soil')}</span>
        <strong>{localizeAgricultureText(crop.suitable_soil_type, language)}</strong>
      </div>
      <div className="crop-detail-item">
        <span className="label-muted">{icon.temperature} {t('area.fields.temperature')}</span>
        <strong>{localizeAgricultureText(crop.ideal_temperature_range, language)}</strong>
      </div>
      <div className="crop-detail-item">
        <span className="label-muted">{icon.rainfall} {t('area.fields.rainfall')}</span>
        <strong>{localizeAgricultureText(crop.rainfall_requirement, language)}</strong>
      </div>
      <div className="crop-detail-item">
        <span className="label-muted">{icon.season} {t('area.fields.season')}</span>
        <strong>{localizeAgricultureText(crop.growing_season, language)}</strong>
      </div>
      <div className="crop-detail-item">
        <span className="label-muted">{icon.plantingMethod} {t('area.fields.plantingMethod')}</span>
        <strong>{localizeAgricultureText(crop.planting_method, language)}</strong>
      </div>
      <div className="crop-detail-item">
        <span className="label-muted">{icon.seedRate} {t('area.fields.seedRate')}</span>
        <strong>{localizeAgricultureText(crop.seed_rate_per_acre, language)}</strong>
      </div>
      <div className="crop-detail-item">
        <span className="label-muted">{icon.growthDuration} {t('area.fields.growthDuration')}</span>
        <strong>{localizeAgricultureText(crop.average_growth_duration, language)}</strong>
      </div>
      <div className="crop-detail-item">
        <span className="label-muted">{icon.fertilizer} {t('area.fields.fertilizer')}</span>
        <strong>{localizeAgricultureText(crop.fertilizer_recommendation, language)}</strong>
      </div>
      <div className="crop-detail-item">
        <span className="label-muted">{icon.irrigationSchedule} {t('area.fields.irrigationSchedule')}</span>
        <strong>{localizeAgricultureText(crop.irrigation_schedule, language)}</strong>
      </div>
      <div className="crop-detail-item">
        <span className="label-muted">{icon.irrigationMethod} {t('area.fields.irrigationMethod')}</span>
        <strong>{localizeAgricultureText(crop.irrigation_method, language)}</strong>
      </div>
      <div className="crop-detail-item">
        <span className="label-muted">{icon.yield} {t('area.fields.yield')}</span>
        <strong>{localizeAgricultureText(crop.expected_yield, language)}</strong>
      </div>
      <div className="crop-detail-item">
        <span className="label-muted">{icon.marketPriceRange} {t('area.fields.marketPriceRange')}</span>
        <strong>{localizeAgricultureText(crop.market_price_range, language)}</strong>
      </div>
      <div className="crop-detail-item crop-details-grid__wide">
        <span className="label-muted">{icon.commonDiseases} {t('area.fields.commonDiseases')}</span>
        <div className="pill-row">
          {crop.common_diseases.map((disease) => (
            <span key={disease} className="pill">
              {localizeAgricultureText(disease, language)}
            </span>
          ))}
        </div>
      </div>
      <div className="crop-detail-item crop-details-grid__wide">
        <span className="label-muted">{icon.diseasePrevention} {t('area.fields.diseasePrevention')}</span>
        <strong>{localizeAgricultureText(crop.disease_prevention, language)}</strong>
      </div>
    </div>
  );
};

export default CropDetails;
