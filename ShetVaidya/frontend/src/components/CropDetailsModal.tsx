import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import type { CropRecommendation } from '../types/areaIntelligence';
import CropDetails from '../pages/CropDetails';
import ReadAloudButton from './ReadAloudButton';
import { localizeAgricultureText } from '../utils/localization';

type CropDetailsModalProps = {
  crop: CropRecommendation | null;
  onClose: () => void;
};

const CropDetailsModal = ({ crop, onClose }: CropDetailsModalProps) => {
  const { t, i18n } = useTranslation();

  if (!crop) return null;

  const language = i18n.language;
  const localizeText = (value: string) => localizeAgricultureText(value, language);

  const narrationText = [
    `${localizeText(crop.crop_name)}. ${t('area.fields.scientificName')}: ${localizeText(crop.scientific_name)}`,
    `${t('area.fields.soil')}: ${localizeText(crop.suitable_soil_type)}`,
    `${t('area.fields.temperature')}: ${localizeText(crop.ideal_temperature_range)}`,
    `${t('area.fields.rainfall')}: ${localizeText(crop.rainfall_requirement)}`,
    `${t('area.fields.water')}: ${localizeText(crop.water_requirement)}`,
    `${t('area.fields.seedRate')}: ${localizeText(crop.seed_rate_per_acre)}`,
    `${t('area.fields.growthDuration')}: ${localizeText(crop.average_growth_duration)}`,
    `${t('area.fields.fertilizer')}: ${localizeText(crop.fertilizer_recommendation)}`,
    `${t('area.fields.irrigationSchedule')}: ${localizeText(crop.irrigation_schedule)}`,
    `${t('area.fields.irrigationMethod')}: ${localizeText(crop.irrigation_method)}`,
    `${t('area.fields.diseasePrevention')}: ${localizeText(crop.disease_prevention)}`,
    `${t('area.fields.marketPriceRange')}: ${localizeText(crop.market_price_range)}`,
    `${t('area.fields.commonDiseases')}: ${crop.common_diseases.map((disease) => localizeText(disease)).join(', ')}`,
  ].join('. ');

  const localizedCropName = localizeText(crop.crop_name);

  return (
    <div className="crop-modal-overlay" role="dialog" aria-modal="true" aria-label={t('area.detailsAria', { crop: localizedCropName })}>
      <div className="crop-modal card">
        <div className="crop-modal__header">
          <div>
            <p className="subtitle">{t('area.detailsTitle')}</p>
            <h2>{localizedCropName}</h2>
          </div>
          <div className="inline-row">
            <ReadAloudButton text={narrationText} labelKey="area.readCropAdvice" />
            <button type="button" className="btn ghost btn--compact" onClick={onClose}>
              {t('area.closeDetails')}
            </button>
          </div>
        </div>

        <CropDetails crop={crop} />

        <div className="inline-row">
          <Link to="/dashboard" className="btn outline btn--compact" onClick={onClose}>
            {t('area.openDiseaseAnalyzer')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CropDetailsModal;
