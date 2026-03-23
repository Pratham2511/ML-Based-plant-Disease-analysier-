const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN-u-nu-deva',
  mr: 'mr-IN-u-nu-deva',
};

type UnitReplacements = Array<[RegExp, string]>;

const UNIT_REPLACEMENTS: Record<string, UnitReplacements> = {
  en: [
    [/\bINR\b/gi, 'INR'],
    [/\bmm\b/gi, 'mm'],
    [/\bdays?\b/gi, 'days'],
    [/\btons?\b/gi, 'tons'],
    [/\bkg\b/gi, 'kg'],
    [/\bg\b/gi, 'g'],
    [/\bhectare\b/gi, 'hectare'],
    [/\bacre\b/gi, 'acre'],
    [/\bquintals?\b/gi, 'quintal'],
    [/\bper season\b/gi, 'per season'],
    [/\bper hectare\b/gi, 'per hectare'],
    [/\bper acre\b/gi, 'per acre'],
    [/\bannually\b/gi, 'annually'],
  ],
  mr: [
    [/\bINR\b/gi, 'रु.'],
    [/\bper season\b/gi, 'प्रति हंगाम'],
    [/\bper hectare\b/gi, 'प्रति हेक्टर'],
    [/\bper acre\b/gi, 'प्रति एकर'],
    [/\bannually\b/gi, 'वार्षिक'],
    [/\bquintals?\b/gi, 'क्विंटल'],
    [/\btons?\b/gi, 'टन'],
    [/\bdays?\b/gi, 'दिवस'],
    [/\bhectare\b/gi, 'हेक्टर'],
    [/\bacre\b/gi, 'एकर'],
    [/\bkg\b/gi, 'कि.ग्रॅ.'],
    [/\bg\b/gi, 'ग्रॅम'],
    [/\bmm\b/gi, 'मिमी'],
    [/\bHigh\b/g, 'उच्च'],
    [/\bModerate\b/g, 'मध्यम'],
    [/\bLow\b/g, 'कमी'],
    [/\bGood\b/g, 'चांगला'],
    [/\bDrip Irrigation\b/gi, 'ठिबक सिंचन'],
    [/\bSprinkler Irrigation\b/gi, 'फवारणी सिंचन'],
    [/\bFlood Irrigation\b/gi, 'पाटबंधारे सिंचन'],
    [/\bBlack Cotton Soil\b/gi, 'काळी कापूसमाती'],
    [/\bAlluvial Loam Soil\b/gi, 'गाळयुक्त दोमट माती'],
    [/\bCoastal Alluvial Soil\b/gi, 'किनारी गाळमाती'],
    [/\bRed and Lateritic Soil\b/gi, 'लाल आणि लेटराइट माती'],
    [/\bLoamy Soil\b/gi, 'दोमट माती'],
    [/\bSandy Loam\b/gi, 'वालुकामय दोमट माती'],
    [/\bClay Loam\b/gi, 'चिकण दोमट माती'],
  ],
  hi: [
    [/\bINR\b/gi, 'रु.'],
    [/\bper season\b/gi, 'प्रति सीजन'],
    [/\bper hectare\b/gi, 'प्रति हेक्टेयर'],
    [/\bper acre\b/gi, 'प्रति एकड़'],
    [/\bannually\b/gi, 'वार्षिक'],
    [/\bquintals?\b/gi, 'क्विंटल'],
    [/\btons?\b/gi, 'टन'],
    [/\bdays?\b/gi, 'दिन'],
    [/\bhectare\b/gi, 'हेक्टेयर'],
    [/\bacre\b/gi, 'एकड़'],
    [/\bkg\b/gi, 'कि.ग्रा.'],
    [/\bg\b/gi, 'ग्राम'],
    [/\bmm\b/gi, 'मिमी'],
    [/\bHigh\b/g, 'उच्च'],
    [/\bModerate\b/g, 'मध्यम'],
    [/\bLow\b/g, 'कम'],
    [/\bGood\b/g, 'अच्छा'],
    [/\bDrip Irrigation\b/gi, 'ड्रिप सिंचाई'],
    [/\bSprinkler Irrigation\b/gi, 'स्प्रिंकलर सिंचाई'],
    [/\bFlood Irrigation\b/gi, 'बाढ़ सिंचाई'],
    [/\bBlack Cotton Soil\b/gi, 'काली कपास मिट्टी'],
    [/\bAlluvial Loam Soil\b/gi, 'जलोढ़ दोमट मिट्टी'],
    [/\bCoastal Alluvial Soil\b/gi, 'तटीय जलोढ़ मिट्टी'],
    [/\bRed and Lateritic Soil\b/gi, 'लाल और लेटराइट मिट्टी'],
    [/\bLoamy Soil\b/gi, 'दोमट मिट्टी'],
    [/\bSandy Loam\b/gi, 'बलुई दोमट मिट्टी'],
    [/\bClay Loam\b/gi, 'चिकनी दोमट मिट्टी'],
  ],
};

export const getLocaleFromLanguage = (language: string) => {
  const baseLanguage = language.split('-')[0];
  return LANGUAGE_TO_LOCALE[baseLanguage] || LANGUAGE_TO_LOCALE.en;
};

export const formatLocalizedNumber = (
  value: number,
  language: string,
  options: Intl.NumberFormatOptions = {}
) => {
  return new Intl.NumberFormat(getLocaleFromLanguage(language), options).format(value);
};

export const localizeNumericText = (text: string, language: string) => {
  const locale = getLocaleFromLanguage(language);
  return text.replace(/-?\d+(?:\.\d+)?/g, (match) => {
    const parsed = Number(match);
    if (Number.isNaN(parsed)) {
      return match;
    }

    const decimalPart = match.includes('.') ? match.split('.')[1] : '';
    const decimalPlaces = decimalPart.length;
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(parsed);
  });
};

export const localizeAgricultureText = (text: string, language: string) => {
  const baseLanguage = language.split('-')[0];
  const replacements = UNIT_REPLACEMENTS[baseLanguage] || UNIT_REPLACEMENTS.en;

  let localized = localizeNumericText(text, language);
  for (const [pattern, replacement] of replacements) {
    localized = localized.replace(pattern, replacement);
  }
  return localized;
};

export const formatLocalizedDateTime = (value: string | Date, language: string) => {
  const dateValue = value instanceof Date ? value : new Date(value);
  return dateValue.toLocaleString(getLocaleFromLanguage(language));
};
