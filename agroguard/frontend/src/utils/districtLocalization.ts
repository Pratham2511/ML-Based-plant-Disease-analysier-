type DistrictTranslation = {
  mr: string;
  hi: string;
};

const DISTRICT_TRANSLATIONS: Record<string, DistrictTranslation> = {
  Ahmednagar: { mr: 'अहमदनगर', hi: 'अहमदनगर' },
  Akola: { mr: 'अकोला', hi: 'अकोला' },
  Amravati: { mr: 'अमरावती', hi: 'अमरावती' },
  Aurangabad: { mr: 'औरंगाबाद', hi: 'औरंगाबाद' },
  Beed: { mr: 'बीड', hi: 'बीड' },
  Bhandara: { mr: 'भंडारा', hi: 'भंडारा' },
  Buldhana: { mr: 'बुलढाणा', hi: 'बुलढाना' },
  Chandrapur: { mr: 'चंद्रपूर', hi: 'चंद्रपुर' },
  Dhule: { mr: 'धुळे', hi: 'धुले' },
  Gadchiroli: { mr: 'गडचिरोली', hi: 'गड़चिरोली' },
  Gondia: { mr: 'गोंदिया', hi: 'गोंदिया' },
  Hingoli: { mr: 'हिंगोली', hi: 'हिंगोली' },
  Jalgaon: { mr: 'जळगाव', hi: 'जलगांव' },
  Jalna: { mr: 'जालना', hi: 'जालना' },
  Kolhapur: { mr: 'कोल्हापूर', hi: 'कोल्हापुर' },
  Latur: { mr: 'लातूर', hi: 'लातूर' },
  'Mumbai City': { mr: 'मुंबई शहर', hi: 'मुंबई शहर' },
  'Mumbai Suburban': { mr: 'मुंबई उपनगर', hi: 'मुंबई उपनगर' },
  Nagpur: { mr: 'नागपूर', hi: 'नागपुर' },
  Nanded: { mr: 'नांदेड', hi: 'नांदेड़' },
  Nandurbar: { mr: 'नंदुरबार', hi: 'नंदुरबार' },
  Nashik: { mr: 'नाशिक', hi: 'नासिक' },
  Osmanabad: { mr: 'उस्मानाबाद', hi: 'उस्मानाबाद' },
  Palghar: { mr: 'पालघर', hi: 'पालघर' },
  Parbhani: { mr: 'परभणी', hi: 'परभणी' },
  Pune: { mr: 'पुणे', hi: 'पुणे' },
  Raigad: { mr: 'रायगड', hi: 'रायगढ़' },
  Ratnagiri: { mr: 'रत्नागिरी', hi: 'रत्नागिरि' },
  Sangli: { mr: 'सांगली', hi: 'सांगली' },
  Satara: { mr: 'सातारा', hi: 'सतारा' },
  Sindhudurg: { mr: 'सिंधुदुर्ग', hi: 'सिंधुदुर्ग' },
  Solapur: { mr: 'सोलापूर', hi: 'सोलापुर' },
  Thane: { mr: 'ठाणे', hi: 'ठाणे' },
  Wardha: { mr: 'वर्धा', hi: 'वर्धा' },
  Washim: { mr: 'वाशिम', hi: 'वाशिम' },
  Yavatmal: { mr: 'यवतमाळ', hi: 'यवतमाल' },
};

export const localizeDistrictName = (district: string, language: string) => {
  const baseLanguage = language.split('-')[0] as 'en' | 'mr' | 'hi';
  if (baseLanguage === 'en') {
    return district;
  }

  const translation = DISTRICT_TRANSLATIONS[district];
  if (!translation) {
    return district;
  }

  return translation[baseLanguage] || district;
};
