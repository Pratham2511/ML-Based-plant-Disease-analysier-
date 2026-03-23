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
  { match: /onion/i, image: '/plant-images/oninon.jpg' },
  { match: /soybean/i, image: '/plant-images/soyabeen.jpg' },
  { match: /cotton/i, image: '/plant-images/cotton.jpg' },
  { match: /sugarcane/i, image: '/plant-images/sugarcane.jpg' },
  { match: /wheat/i, image: '/plant-images/wheat.jpg' },
  { match: /turmeric/i, image: '/plant-images/turmeric.jpg' },
  { match: /mustard/i, image: '/plant-images/mustard.jpg' },
  { match: /pigeon\s*pea|tur/i, image: '/plant-images/piegoan-pea.jpg' },
  { match: /sorghum|jowar/i, image: '/plant-images/jowar.jpg' },
  { match: /chickpea/i, image: '/plant-images/chickpea.jpg' },
  { match: /bajra|pearl\s*millet/i, image: '/plant-images/bajra.jpg' },
  { match: /potato/i, image: '/plant-images/Potato.jpg' },
  { match: /rice/i, image: '/plant-images/Rice.jpg' },
  { match: /maize/i, image: '/plant-images/Maize.jpg' },
  { match: /groundnut/i, image: '/plant-images/Groundnut.jpg' },
  { match: /sunflower/i, image: '/plant-images/Sunflower.jpg' },
  { match: /green\s*gram|moong/i, image: '/plant-images/Green Gram.jpg' },
  { match: /black\s*gram|urad/i, image: '/plant-images/Black Gram.jpg' },
  { match: /chili/i, image: '/plant-images/Chili.jpg' },
  { match: /garlic/i, image: '/plant-images/Garlic.jpg' },
  { match: /ginger/i, image: '/plant-images/Ginger.jpg' },
  { match: /banana/i, image: '/plant-images/Banana.jpg' },
  { match: /papaya/i, image: '/plant-images/Papaya.jpg' },
  { match: /mango/i, image: '/plant-images/Mango.jpg' },
  { match: /guava/i, image: '/plant-images/Guava.jpg' },
  { match: /pomegranate/i, image: '/plant-images/Pomegranate.jpg' },
  { match: /grapes/i, image: '/plant-images/Grapes.jpg' },
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
  if (typeof imageUrl === 'string' && imageUrl.trim().startsWith('/plant-images/')) {
    return imageUrl.trim();
  }
  const mappedImage = CROP_IMAGE_BY_NAME.find((entry) => entry.match.test(cropName))?.image;
  return mappedImage || DEFAULT_CROP_IMAGE;
};

const CropCard = ({ crop, onOpenDetails }: CropCardProps) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const isMarathi = language.split('-')[0] === 'mr';
  const preferredImage = useMemo(() => resolveCropImage(crop.crop_name, crop.crop_image), [crop.crop_name, crop.crop_image]);
  const [imageSrc, setImageSrc] = useState(preferredImage);

  const localizeAreaMetric = (value: string) => {
    let localized = localizeAgricultureText(value, language);
    const unitTokens: Array<[RegExp, string]> = [
      [/\bmm\s*\/\s*season\b/gi, t('area.units.mmPerSeason')],
      [/\btons?\s+per\s+hectare\b/gi, t('area.units.tonsPerHectare')],
      [/\bquintals?\s+per\s+acre\b/gi, t('area.units.quintalsPerAcre')],
      [/\bper\s+season\b/gi, t('area.units.perSeason')],
      [/\bper\s+hectare\b/gi, t('area.units.perHectare')],
      [/\bper\s+acre\b/gi, t('area.units.perAcre')],
      [/\bannually\b/gi, t('area.units.annually')],
    ];

    for (const [pattern, replacement] of unitTokens) {
      localized = localized.replace(pattern, replacement);
    }
    return localized;
  };

  useEffect(() => {
    setImageSrc(preferredImage);
  }, [preferredImage]);

  const handleImageError = () => {
    if (imageSrc !== DEFAULT_CROP_IMAGE) {
      setImageSrc(DEFAULT_CROP_IMAGE);
    }
  };

  return (
    <article className={`crop-card ${isMarathi ? 'marathi-text' : ''}`}>
      <div className="crop-card__image-wrap">
        <img src={imageSrc} alt={crop.crop_name} className="crop-card__image" loading="lazy" onError={handleImageError} />
      </div>

      <div className="crop-card__content">
        <h3>{crop.crop_name}</h3>
        <div className="crop-card__facts">
          <span>
            <strong>{FIELD_ICONS.season} {t('area.fields.season')}:</strong> {localizeAreaMetric(crop.growing_season)}
          </span>
          <span>
            <strong>{FIELD_ICONS.water} {t('area.fields.water')}:</strong> {localizeAreaMetric(crop.water_requirement)}
          </span>
          <span>
            <strong>{FIELD_ICONS.temperature} {t('area.fields.temperature')}:</strong> {localizeAreaMetric(crop.ideal_temperature_range)}
          </span>
          <span>
            <strong>{FIELD_ICONS.yield} {t('area.fields.yield')}:</strong> {localizeAreaMetric(crop.expected_yield)}
          </span>
          <span>
            <strong>{FIELD_ICONS.risk} {t('area.fields.risk')}:</strong> {localizeAreaMetric(crop.pest_disease_risk_level)}
          </span>
          <span>
            <strong>{FIELD_ICONS.market} {t('area.fields.marketDemand')}:</strong> {localizeAreaMetric(crop.market_demand_indicator)}
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
