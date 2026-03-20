import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { CropRecommendation } from '../types/areaIntelligence';
import { localizeAgricultureText } from '../utils/localization';

type CropCardProps = {
  crop: CropRecommendation;
  onOpenDetails: (crop: CropRecommendation) => void;
};

const DEFAULT_CROP_IMAGE = '/plant-images/wheat.jpg';

const CROP_IMAGE_BY_NAME: Array<{ match: RegExp; image: string }> = [
  { match: /tomato/i, image: '/plant-images/tomato.jpg' },
  { match: /onion/i, image: '/plant-images/onion.jpg' },
  { match: /soybean/i, image: '/plant-images/soybean.jpg' },
  { match: /cotton/i, image: '/plant-images/cotton.jpg' },
  { match: /sugarcane/i, image: '/plant-images/sugarcane.jpg' },
  { match: /wheat/i, image: '/plant-images/wheat.jpg' },
  { match: /turmeric/i, image: '/plant-images/turmeric.jpg' },
  { match: /mustard/i, image: '/plant-images/mustard.jpg' },
  { match: /pigeon\s*pea|tur/i, image: '/plant-images/pigeon-pea.jpg' },
  { match: /sorghum|jowar/i, image: '/plant-images/jowar.jpg' },
  { match: /chickpea/i, image: '/plant-images/chickpea.jpg' },
  { match: /bajra|pearl\s*millet/i, image: '/plant-images/bajra.jpg' },
];

const FIELD_ICONS = {
  season: '🗓️',
  water: '💧',
  temperature: '🌡️',
  yield: '🌾',
  risk: '⚠️',
  market: '📈',
} as const;

const resolveCropImage = (cropName: string, imageUrl?: string) => {
  const mappedImage = CROP_IMAGE_BY_NAME.find((entry) => entry.match.test(cropName))?.image;
  return mappedImage || DEFAULT_CROP_IMAGE;
};

const CropCard = ({ crop, onOpenDetails }: CropCardProps) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const preferredImage = useMemo(() => resolveCropImage(crop.crop_name, crop.crop_image), [crop.crop_name, crop.crop_image]);
  const [imageSrc, setImageSrc] = useState(preferredImage);

  useEffect(() => {
    setImageSrc(preferredImage);
  }, [preferredImage]);

  const handleImageError = () => {
    if (imageSrc !== DEFAULT_CROP_IMAGE) {
      setImageSrc(DEFAULT_CROP_IMAGE);
    }
  };

  return (
    <article className="crop-card">
      <div className="crop-card__image-wrap">
        <img src={imageSrc} alt={crop.crop_name} className="crop-card__image" loading="lazy" onError={handleImageError} />
      </div>

      <div className="crop-card__content">
        <h3>{crop.crop_name}</h3>
        <div className="crop-card__facts">
          <span>
            <strong>{FIELD_ICONS.season} {t('area.fields.season')}:</strong> {localizeAgricultureText(crop.growing_season, language)}
          </span>
          <span>
            <strong>{FIELD_ICONS.water} {t('area.fields.water')}:</strong> {localizeAgricultureText(crop.water_requirement, language)}
          </span>
          <span>
            <strong>{FIELD_ICONS.temperature} {t('area.fields.temperature')}:</strong> {localizeAgricultureText(crop.ideal_temperature_range, language)}
          </span>
          <span>
            <strong>{FIELD_ICONS.yield} {t('area.fields.yield')}:</strong> {localizeAgricultureText(crop.expected_yield, language)}
          </span>
          <span>
            <strong>{FIELD_ICONS.risk} {t('area.fields.risk')}:</strong> {localizeAgricultureText(crop.pest_disease_risk_level, language)}
          </span>
          <span>
            <strong>{FIELD_ICONS.market} {t('area.fields.marketDemand')}:</strong> {localizeAgricultureText(crop.market_demand_indicator, language)}
          </span>
        </div>

        <button type="button" className="btn outline" onClick={() => onOpenDetails(crop)}>
          {t('area.openDetails')}
        </button>
      </div>
    </article>
  );
};

export default CropCard;
