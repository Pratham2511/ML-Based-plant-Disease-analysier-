import type { TFunction } from 'i18next';

const MODEL_CLASS_KEY_MAP: Record<string, string> = {
  // Generic aliases returned by some model wrappers
  early_blight: 'early_blight',
  late_blight: 'late_blight',
  bacterial_spot: 'bacterial_spot',
  leaf_mold: 'leaf_mold',
  septoria_leaf_spot: 'septoria_leaf_spot',
  spider_mites: 'spider_mites',
  target_spot: 'target_spot',
  yellow_leaf_curl_virus: 'yellow_leaf_curl_virus',
  mosaic_virus: 'mosaic_virus',
  healthy: 'healthy',
  healthy_tomato: 'tomato_healthy',
  healthy_tomato_plant: 'tomato_healthy',
  healthy_potato: 'potato_healthy',
  healthy_bell_pepper: 'bell_pepper_healthy',
  not_a_leaf: 'garbage_not_leaf',

  // Canonical class ids from the backend model
  bell_pepper_bacterial_spot: 'bell_pepper_bacterial_spot',
  bell_pepper_healthy: 'bell_pepper_healthy',
  potato_early_blight: 'potato_early_blight',
  potato_late_blight: 'potato_late_blight',
  potato_healthy: 'potato_healthy',
  tomato_bacterial_spot: 'tomato_bacterial_spot',
  tomato_early_blight: 'tomato_early_blight',
  tomato_late_blight: 'tomato_late_blight',
  tomato_leaf_mold: 'tomato_leaf_mold',
  tomato_septoria_leaf_spot: 'tomato_septoria_leaf_spot',
  tomato_spider_mites_two_spotted_spider_mite: 'tomato_spider_mites_two_spotted_spider_mite',
  tomato_target_spot: 'tomato_target_spot',
  tomato_yellow_leaf_curl_virus: 'tomato_yellow_leaf_curl_virus',
  tomato_mosaic_virus: 'tomato_mosaic_virus',
  tomato_healthy: 'tomato_healthy',
  garbage_not_leaf: 'garbage_not_leaf',

  // Friendly disease names that may come from API or history payloads
  early_blight_disease: 'early_blight',
  late_blight_disease: 'late_blight',
  bell_pepper_bacterial_spot_disease: 'bell_pepper_bacterial_spot',
  tomato_bacterial_spot_disease: 'tomato_bacterial_spot',
};

const normalizeModelValue = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const cropPrefixPattern = /^(bell_pepper|potato|tomato)_/;

export const resolveModelClassKey = (...values: Array<string | undefined | null>): string | null => {
  for (const rawValue of values) {
    if (!rawValue) {
      continue;
    }
    const normalized = normalizeModelValue(rawValue);
    const mapped = MODEL_CLASS_KEY_MAP[normalized];
    if (mapped) {
      return mapped;
    }
    if (normalized in MODEL_CLASS_KEY_MAP) {
      return normalized;
    }
  }
  return null;
};

const getClassKeyCandidates = (classKey: string | null): string[] => {
  if (!classKey) {
    return [];
  }

  const candidates = new Set<string>([classKey]);
  const genericKey = classKey.replace(cropPrefixPattern, '');
  if (genericKey !== classKey) {
    candidates.add(genericKey);
  }

  if (classKey.includes('spider_mites')) {
    candidates.add('spider_mites');
  }
  if (classKey.includes('yellow_leaf_curl_virus')) {
    candidates.add('yellow_leaf_curl_virus');
  }
  if (classKey.includes('mosaic_virus')) {
    candidates.add('mosaic_virus');
  }
  if (classKey.includes('septoria_leaf_spot')) {
    candidates.add('septoria_leaf_spot');
  }

  return Array.from(candidates);
};

export const localizeModelClassLabel = (
  t: TFunction,
  classKey: string | null,
  fallbackValue: string
): string => {
  const candidates = getClassKeyCandidates(classKey);
  for (const key of candidates) {
    const titlePath = `diseases.${key}.title`;
    const titleTranslated = t(titlePath, { defaultValue: '' });
    if (titleTranslated && titleTranslated !== titlePath) {
      return titleTranslated;
    }

    const labelPath = `diseases.${key}`;
    const labelTranslated = t(labelPath, { defaultValue: '' });
    if (labelTranslated && labelTranslated !== labelPath) {
      return labelTranslated;
    }
  }
  return fallbackValue;
};

export const localizeModelAdvice = (
  t: TFunction,
  classKey: string | null,
  field: 'description' | 'cause' | 'treatment',
  fallbackValue: string
): string => {
  const candidates = getClassKeyCandidates(classKey);
  for (const key of candidates) {
    const diseasePath = `diseases.${key}.${field}`;
    const diseaseTranslated = t(diseasePath, { defaultValue: '' });
    if (diseaseTranslated && diseaseTranslated !== diseasePath) {
      return diseaseTranslated;
    }

    const advicePath = `mlAdvice.${key}.${field}`;
    const adviceTranslated = t(advicePath, { defaultValue: '' });
    if (adviceTranslated && adviceTranslated !== advicePath) {
      return adviceTranslated;
    }
  }
  return fallbackValue;
};
