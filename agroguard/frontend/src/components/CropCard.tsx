import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { CropRecommendation } from '../types/areaIntelligence';
import { localizeAgricultureText } from '../utils/localization';

type CropCardProps = {
  crop: CropRecommendation;
  onOpenDetails: (crop: CropRecommendation) => void;
};

const DEFAULT_CROP_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/3/38/Crops_in_a_field_near_Mysore.jpg';

const CROP_IMAGE_BY_NAME: Array<{ match: RegExp; image: string }> = [
  { match: /tomato/i, image: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tomato_je.jpg' },
  { match: /onion/i, image: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Onion.jpg' },
  { match: /potato/i, image: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Potato_and_cross_section.jpg' },
  { match: /soybean/i, image: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Soybean.USDA.jpg' },
  { match: /cotton/i, image: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Cotton_%28Gossypium_hirsutum%29.jpg' },
  { match: /sugarcane/i, image: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sugar_Cane_Field.jpg' },
  { match: /wheat/i, image: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Wheat_close-up.JPG' },
  { match: /rice/i, image: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Rice_plants_%28IRRI%29.jpg' },
  { match: /maize|corn/i, image: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Maize_crop.jpg' },
  { match: /banana/i, image: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Banana-Single.jpg' },
  { match: /papaya/i, image: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Papaya_cross_section_BNC.jpg' },
  { match: /guava/i, image: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Guava_ID.jpg' },
  { match: /chili|chilli/i, image: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Red_chili.jpg' },
  { match: /garlic/i, image: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Garlic_bulbs.jpg' },
  { match: /turmeric/i, image: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Turmeric-rhizome.jpg' },
  { match: /ginger/i, image: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Ginger_root.jpg' },
  { match: /groundnut|peanut/i, image: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Peanut_9417.jpg' },
  { match: /sunflower/i, image: 'https://upload.wikimedia.org/wikipedia/commons/4/40/Sunflower_sky_backdrop.jpg' },
  { match: /pomegranate/i, image: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Pomegranate_Juice_%282013%29.jpg' },
  { match: /grape/i, image: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Table_grapes_on_white.jpg' },
  { match: /mustard/i, image: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Yellow_Mustard_flowers.jpg' },
  { match: /pigeon\s*pea|tur/i, image: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Cajanus_cajan_04.jpg' },
  { match: /green\s*gram|moong/i, image: 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Vigna_radiata_02.jpg' },
  { match: /black\s*gram|urad/i, image: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Urad_dal.jpg' },
  { match: /mango/i, image: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Hapus_Mango.jpg' },
  { match: /cashew/i, image: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Cashew_fruit.jpg' },
  { match: /sorghum|jowar/i, image: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Sorghum_bicolor.jpg' },
  { match: /chickpea/i, image: 'https://upload.wikimedia.org/wikipedia/commons/5/58/Chickpea_noodles.jpg' },
];

const resolveCropImage = (cropName: string, imageUrl?: string) => {
  const mappedImage = CROP_IMAGE_BY_NAME.find((entry) => entry.match.test(cropName))?.image;
  return mappedImage || imageUrl || DEFAULT_CROP_IMAGE;
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
            <strong>{t('area.fields.season')}:</strong> {localizeAgricultureText(crop.growing_season, language)}
          </span>
          <span>
            <strong>{t('area.fields.water')}:</strong> {localizeAgricultureText(crop.water_requirement, language)}
          </span>
          <span>
            <strong>{t('area.fields.temperature')}:</strong> {localizeAgricultureText(crop.ideal_temperature_range, language)}
          </span>
          <span>
            <strong>{t('area.fields.yield')}:</strong> {localizeAgricultureText(crop.expected_yield, language)}
          </span>
          <span>
            <strong>{t('area.fields.risk')}:</strong> {localizeAgricultureText(crop.pest_disease_risk_level, language)}
          </span>
          <span>
            <strong>{t('area.fields.marketDemand')}:</strong> {localizeAgricultureText(crop.market_demand_indicator, language)}
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
