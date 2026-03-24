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
    [/\bHigh\b/gi, 'उच्च'],
    [/\bModerate\b/gi, 'मध्यम'],
    [/\bMedium\b/gi, 'मध्यम'],
    [/\bLow\b/gi, 'कमी'],
    [/\bGood\b/gi, 'चांगला'],
    [/\bKharif\b/gi, 'खरीप'],
    [/\bRabi\b/gi, 'रब्बी'],
    [/\bSummer\b/gi, 'उन्हाळा'],
    [/\bWinter\b/gi, 'हिवाळा'],
    [/\bAdsali\b/gi, 'आडसाली'],
    [/\bRainfed\b/gi, 'पावसावर अवलंबून'],
    [/\bDrip Irrigation\b/gi, 'ठिबक सिंचन'],
    [/\bSprinkler Irrigation\b/gi, 'फवारणी सिंचन'],
    [/\bFlood Irrigation\b/gi, 'पाटबंधारे सिंचन'],
    [/\bFurrow Irrigation\b/gi, 'फरो सिंचन'],
    [/\bDirect line sowing\b/gi, 'सरळ ओळ पेरणी'],
    [/\bMostly rainfed; one life irrigation in dry spells\b/gi, 'मुख्यतः पावसावर अवलंबून; दुष्काळी काळात एक जीवनदायी सिंचन'],
    [/\bDAP with sulfur and Rhizobium inoculation\b/gi, 'डीएपी सोबत सल्फर आणि रायझोबियम इनोक्युलेशन'],
    [/\bTimely sowing and resistant varieties\.?\b/gi, 'वेळेवर पेरणी आणि रोगप्रतिकारक वाण'],
    [/\bYellow Mosaic Virus\b/gi, 'पिवळा मोझॅक विषाणू'],
    [/\bRust\b/gi, 'रस्ट'],
    [/\bBlack Cotton Soil\b/gi, 'काळी कापूसमाती'],
    [/\bAlluvial Loam Soil\b/gi, 'गाळयुक्त दोमट माती'],
    [/\bCoastal Alluvial Soil\b/gi, 'किनारी गाळमाती'],
    [/\bRed and Lateritic Soil\b/gi, 'लाल आणि लेटराइट माती'],
    [/\bLoamy Soil\b/gi, 'दोमट माती'],
    [/\bSandy Loam\b/gi, 'वालुकामय दोमट माती'],
    [/\bClay Loam\b/gi, 'चिकण दोमट माती'],
    [/\bSoybean\b/gi, 'सोयाबीन'],
    [/\bSugarcane\b/gi, 'ऊस'],
    [/\bTurmeric\b/gi, 'हळद'],
    [/\bMustard\b/gi, 'मोहरी'],
    [/\bPearl Millet \(Bajra\)\b/gi, 'बाजरी'],
    [/\bSorghum \(Jowar\)\b/gi, 'ज्वारी'],
    [/\bPigeon Pea \(Tur\)\b/gi, 'तूर'],
    [/\bChickpea\b/gi, 'हरभरा'],
    [/\bCotton\b/gi, 'कापूस'],
    [/\bWheat\b/gi, 'गहू'],
    [/\bOnion\b/gi, 'कांदा'],
    [/\bTomato\b/gi, 'टोमॅटो'],
    [/\bHealthy Tomato Plant\b/gi, 'निरोगी टोमॅटो वनस्पती'],
    [/\bLeaves are a rich, even green with no mottling, spots, or curling\. Stems are sturdy\.\b/gi, 'पाने समसमान गडद हिरवी आहेत; डाग, कुरळेपणा किंवा विकृती नाही. देठ मजबूत आहेत.'],
    [/\bExcellent agronomic practices, balanced nutrition, and good pest management\.\b/gi, 'उत्तम कृषी पद्धती, संतुलित पोषण आणि चांगले कीड व्यवस्थापन.'],
    [/\bMaintain preventative care routines\.\b/gi, 'प्रतिबंधात्मक काळजीची नियमित पद्धत सुरू ठेवा.'],
    [/\bNo treatment required\. Use Neem oil spray periodically as a preventative organic measure against pests\.\b/gi, 'उपचाराची गरज नाही. किडींपासून संरक्षणासाठी कडुनिंब तेलाची फवारणी प्रतिबंधात्मक सेंद्रिय उपाय म्हणून नियमित करा.'],
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
    [/\bHigh\b/gi, 'उच्च'],
    [/\bModerate\b/gi, 'मध्यम'],
    [/\bMedium\b/gi, 'मध्यम'],
    [/\bLow\b/gi, 'कम'],
    [/\bGood\b/gi, 'अच्छा'],
    [/\bKharif\b/gi, 'खरीफ'],
    [/\bRabi\b/gi, 'रबी'],
    [/\bSummer\b/gi, 'गर्मी'],
    [/\bWinter\b/gi, 'सर्दी'],
    [/\bAdsali\b/gi, 'अडसाली'],
    [/\bRainfed\b/gi, 'वर्षा आधारित'],
    [/\bDrip Irrigation\b/gi, 'ड्रिप सिंचाई'],
    [/\bSprinkler Irrigation\b/gi, 'स्प्रिंकलर सिंचाई'],
    [/\bFlood Irrigation\b/gi, 'बाढ़ सिंचाई'],
    [/\bFurrow Irrigation\b/gi, 'नाली सिंचाई'],
    [/\bDirect line sowing\b/gi, 'सीधी कतार बुवाई'],
    [/\bMostly rainfed; one life irrigation in dry spells\b/gi, 'मुख्यतः वर्षा आधारित; सूखे अंतराल में एक जीवनरक्षक सिंचाई'],
    [/\bDAP with sulfur and Rhizobium inoculation\b/gi, 'डीएपी के साथ सल्फर और राइजोबियम इनोक्युलेशन'],
    [/\bTimely sowing and resistant varieties\.?\b/gi, 'समय पर बुवाई और रोगरोधी किस्में'],
    [/\bYellow Mosaic Virus\b/gi, 'पीला मोज़ेक वायरस'],
    [/\bRust\b/gi, 'रस्ट'],
    [/\bBlack Cotton Soil\b/gi, 'काली कपास मिट्टी'],
    [/\bAlluvial Loam Soil\b/gi, 'जलोढ़ दोमट मिट्टी'],
    [/\bCoastal Alluvial Soil\b/gi, 'तटीय जलोढ़ मिट्टी'],
    [/\bRed and Lateritic Soil\b/gi, 'लाल और लेटराइट मिट्टी'],
    [/\bLoamy Soil\b/gi, 'दोमट मिट्टी'],
    [/\bSandy Loam\b/gi, 'बलुई दोमट मिट्टी'],
    [/\bClay Loam\b/gi, 'चिकनी दोमट मिट्टी'],
    [/\bSoybean\b/gi, 'सोयाबीन'],
    [/\bSugarcane\b/gi, 'गन्ना'],
    [/\bTurmeric\b/gi, 'हल्दी'],
    [/\bMustard\b/gi, 'सरसों'],
    [/\bPearl Millet \(Bajra\)\b/gi, 'बाजरा'],
    [/\bSorghum \(Jowar\)\b/gi, 'ज्वार'],
    [/\bPigeon Pea \(Tur\)\b/gi, 'अरहर'],
    [/\bChickpea\b/gi, 'चना'],
    [/\bCotton\b/gi, 'कपास'],
    [/\bWheat\b/gi, 'गेहूं'],
    [/\bOnion\b/gi, 'प्याज'],
    [/\bTomato\b/gi, 'टमाटर'],
    [/\bHealthy Tomato Plant\b/gi, 'स्वस्थ टमाटर पौधा'],
    [/\bLeaves are a rich, even green with no mottling, spots, or curling\. Stems are sturdy\.\b/gi, 'पत्तियां गहरे और समान हरे रंग की हैं; धब्बे, मुरझाहट या मुड़ाव नहीं है। तने मजबूत हैं।'],
    [/\bExcellent agronomic practices, balanced nutrition, and good pest management\.\b/gi, 'उत्तम कृषि पद्धतियां, संतुलित पोषण और अच्छा कीट प्रबंधन।'],
    [/\bMaintain preventative care routines\.\b/gi, 'नियमित रोकथाम देखभाल जारी रखें।'],
    [/\bNo treatment required\. Use Neem oil spray periodically as a preventative organic measure against pests\.\b/gi, 'उपचार की आवश्यकता नहीं है। कीटों से बचाव के लिए नीम तेल स्प्रे को समय-समय पर रोकथाम हेतु प्रयोग करें।'],
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
