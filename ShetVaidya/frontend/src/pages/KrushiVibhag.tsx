import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import FarmSlideshow from '../components/FarmSlideshow';
import SchemePopup, { type SchemeData } from '../components/SchemePopup';
import { MAHARASHTRA_DISTRICTS, localizeDistrictName } from '../utils/districtLocalization';

type DistrictOffice = {
  district: string;
  districtMr: string;
  districtHi: string;
  address: string;
  phone: string;
  maps: string;
};

const DISTRICT_OFFICES: DistrictOffice[] = [
  { district: 'Ahmednagar', districtMr: 'अहमदनगर', districtHi: 'अहमदनगर', address: 'Krushi Bhavan, Savedi Road, Ahmednagar - 414003', phone: '0241-2348600', maps: 'Krushi Vibhag Ahmednagar Maharashtra' },
  { district: 'Akola', districtMr: 'अकोला', districtHi: 'अकोला', address: 'Zilla Krushi Adhikari Karyalay, Civil Lines, Akola - 444001', phone: '0724-2420642', maps: 'Krushi Vibhag Akola Maharashtra' },
  { district: 'Amravati', districtMr: 'अमरावती', districtHi: 'अमरावती', address: 'Zilla Krushi Adhikari Karyalay, Amravati - 444601', phone: '0721-2662557', maps: 'Krushi Vibhag Amravati Maharashtra' },
  { district: 'Aurangabad', districtMr: 'औरंगाबाद', districtHi: 'औरंगाबाद', address: 'Krushi Bhavan, Osmanpura, Aurangabad - 431005', phone: '0240-2331574', maps: 'Krushi Vibhag Aurangabad Maharashtra' },
  { district: 'Beed', districtMr: 'बीड', districtHi: 'बीड', address: 'Zilla Krushi Adhikari Karyalay, Beed - 431122', phone: '02442-222386', maps: 'Krushi Vibhag Beed Maharashtra' },
  { district: 'Bhandara', districtMr: 'भंडारा', districtHi: 'भंडारा', address: 'Zilla Krushi Adhikari Karyalay, Bhandara - 441904', phone: '07184-252302', maps: 'Krushi Vibhag Bhandara Maharashtra' },
  { district: 'Buldhana', districtMr: 'बुलढाणा', districtHi: 'बुलढाणा', address: 'Zilla Krushi Adhikari Karyalay, Buldhana - 443001', phone: '07262-242286', maps: 'Krushi Vibhag Buldhana Maharashtra' },
  { district: 'Chandrapur', districtMr: 'चंद्रपूर', districtHi: 'चंद्रपुर', address: 'Zilla Krushi Adhikari Karyalay, Chandrapur - 442401', phone: '07172-252525', maps: 'Krushi Vibhag Chandrapur Maharashtra' },
  { district: 'Dhule', districtMr: 'धुळे', districtHi: 'धुले', address: 'Zilla Krushi Adhikari Karyalay, Dhule - 424001', phone: '02562-282626', maps: 'Krushi Vibhag Dhule Maharashtra' },
  { district: 'Gadchiroli', districtMr: 'गडचिरोली', districtHi: 'गड़चिरोली', address: 'Zilla Krushi Adhikari Karyalay, Gadchiroli - 442605', phone: '07132-222134', maps: 'Krushi Vibhag Gadchiroli Maharashtra' },
  { district: 'Gondia', districtMr: 'गोंदिया', districtHi: 'गोंदिया', address: 'Zilla Krushi Adhikari Karyalay, Gondia - 441601', phone: '07182-235353', maps: 'Krushi Vibhag Gondia Maharashtra' },
  { district: 'Hingoli', districtMr: 'हिंगोली', districtHi: 'हिंगोली', address: 'Zilla Krushi Adhikari Karyalay, Hingoli - 431513', phone: '02456-222298', maps: 'Krushi Vibhag Hingoli Maharashtra' },
  { district: 'Jalgaon', districtMr: 'जळगाव', districtHi: 'जलगांव', address: 'Krushi Bhavan, Jalgaon - 425001', phone: '0257-2229371', maps: 'Krushi Vibhag Jalgaon Maharashtra' },
  { district: 'Jalna', districtMr: 'जालना', districtHi: 'जालना', address: 'Zilla Krushi Adhikari Karyalay, Jalna - 431203', phone: '02482-230340', maps: 'Krushi Vibhag Jalna Maharashtra' },
  { district: 'Kolhapur', districtMr: 'कोल्हापूर', districtHi: 'कोल्हापुर', address: 'Krushi Bhavan, Rajaram Road, Kolhapur - 416003', phone: '0231-2650387', maps: 'Krushi Vibhag Kolhapur Maharashtra' },
  { district: 'Latur', districtMr: 'लातूर', districtHi: 'लातूर', address: 'Zilla Krushi Adhikari Karyalay, Latur - 413512', phone: '02382-220273', maps: 'Krushi Vibhag Latur Maharashtra' },
  { district: 'Mumbai City', districtMr: 'मुंबई शहर', districtHi: 'मुंबई शहर', address: 'Krushi Bhavan, Bandra East, Mumbai - 400051', phone: '022-26592207', maps: 'Krushi Vibhag Mumbai Maharashtra' },
  { district: 'Mumbai Suburban', districtMr: 'मुंबई उपनगर', districtHi: 'मुंबई उपनगर', address: 'Zilla Krushi Adhikari Karyalay, Bandra, Mumbai - 400051', phone: '022-26592208', maps: 'Krushi Vibhag Mumbai Suburban Maharashtra' },
  { district: 'Nagpur', districtMr: 'नागपूर', districtHi: 'नागपुर', address: 'Krushi Bhavan, Civil Lines, Nagpur - 440001', phone: '0712-2562649', maps: 'Krushi Vibhag Nagpur Maharashtra' },
  { district: 'Nanded', districtMr: 'नांदेड', districtHi: 'नांदेड़', address: 'Zilla Krushi Adhikari Karyalay, Nanded - 431601', phone: '02462-236676', maps: 'Krushi Vibhag Nanded Maharashtra' },
  { district: 'Nandurbar', districtMr: 'नंदुरबार', districtHi: 'नंदुरबार', address: 'Zilla Krushi Adhikari Karyalay, Nandurbar - 425412', phone: '02564-210255', maps: 'Krushi Vibhag Nandurbar Maharashtra' },
  { district: 'Nashik', districtMr: 'नाशिक', districtHi: 'नासिक', address: 'Krushi Bhavan, Nashik Road, Nashik - 422101', phone: '0253-2465120', maps: 'Krushi Vibhag Nashik Maharashtra' },
  { district: 'Osmanabad', districtMr: 'उस्मानाबाद', districtHi: 'उस्मानाबाद', address: 'Zilla Krushi Adhikari Karyalay, Osmanabad - 413501', phone: '02472-222280', maps: 'Krushi Vibhag Osmanabad Maharashtra' },
  { district: 'Palghar', districtMr: 'पालघर', districtHi: 'पालघर', address: 'Zilla Krushi Adhikari Karyalay, Palghar - 401404', phone: '02525-252626', maps: 'Krushi Vibhag Palghar Maharashtra' },
  { district: 'Parbhani', districtMr: 'परभणी', districtHi: 'परभणी', address: 'Zilla Krushi Adhikari Karyalay, Parbhani - 431401', phone: '02452-222283', maps: 'Krushi Vibhag Parbhani Maharashtra' },
  { district: 'Pune', districtMr: 'पुणे', districtHi: 'पुणे', address: 'Krushi Bhavan, Shivajinagar, Pune - 411005', phone: '020-25536100', maps: 'Krushi Vibhag Pune Maharashtra' },
  { district: 'Raigad', districtMr: 'रायगड', districtHi: 'रायगड़', address: 'Zilla Krushi Adhikari Karyalay, Alibag, Raigad - 402201', phone: '02141-222281', maps: 'Krushi Vibhag Raigad Maharashtra' },
  { district: 'Ratnagiri', districtMr: 'रत्नागिरी', districtHi: 'रत्नागिरी', address: 'Zilla Krushi Adhikari Karyalay, Ratnagiri - 415612', phone: '02352-221178', maps: 'Krushi Vibhag Ratnagiri Maharashtra' },
  { district: 'Sangli', districtMr: 'सांगली', districtHi: 'सांगली', address: 'Krushi Bhavan, Sangli - 416416', phone: '0233-2373596', maps: 'Krushi Vibhag Sangli Maharashtra' },
  { district: 'Satara', districtMr: 'सातारा', districtHi: 'सातारा', address: 'Zilla Krushi Adhikari Karyalay, Satara - 415001', phone: '02162-233257', maps: 'Krushi Vibhag Satara Maharashtra' },
  { district: 'Sindhudurg', districtMr: 'सिंधुदुर्ग', districtHi: 'सिंधुदुर्ग', address: 'Zilla Krushi Adhikari Karyalay, Oras, Sindhudurg - 416812', phone: '02362-228551', maps: 'Krushi Vibhag Sindhudurg Maharashtra' },
  { district: 'Solapur', districtMr: 'सोलापूर', districtHi: 'सोलापुर', address: 'Krushi Bhavan, Solapur - 413003', phone: '0217-2728822', maps: 'Krushi Vibhag Solapur Maharashtra' },
  { district: 'Thane', districtMr: 'ठाणे', districtHi: 'ठाणे', address: 'Zilla Krushi Adhikari Karyalay, Thane - 400601', phone: '022-25344791', maps: 'Krushi Vibhag Thane Maharashtra' },
  { district: 'Wardha', districtMr: 'वर्धा', districtHi: 'वर्धा', address: 'Zilla Krushi Adhikari Karyalay, Wardha - 442001', phone: '07152-242537', maps: 'Krushi Vibhag Wardha Maharashtra' },
  { district: 'Washim', districtMr: 'वाशिम', districtHi: 'वाशिम', address: 'Zilla Krushi Adhikari Karyalay, Washim - 444505', phone: '07252-232383', maps: 'Krushi Vibhag Washim Maharashtra' },
  { district: 'Yavatmal', districtMr: 'यवतमाळ', districtHi: 'यवतमाल', address: 'Zilla Krushi Adhikari Karyalay, Yavatmal - 445001', phone: '07232-242522', maps: 'Krushi Vibhag Yavatmal Maharashtra' },
];

const SCHEMES: SchemeData[] = [
  {
    id: 'pmfby',
    name: 'PM Fasal Bima Yojana',
    nameMr: 'पीएम पीक विमा योजना',
    nameHi: 'पीएम फसल बीमा योजना',
    tagline: 'Crop Insurance Protection',
    taglineMr: 'पीक विमा संरक्षण',
    taglineHi: 'फसल बीमा सुरक्षा',
    description: 'Crop insurance against natural calamities, pests and diseases',
    eligibility: 'All farmers growing notified crops',
    url: 'https://pmfby.gov.in',
    icon: '🌾',
    color: '#3B6D11',
    benefitAmount: 'Up to ₹2 lakh per hectare',
    benefitAmountMr: 'प्रति हेक्टर ₹२ लाखांपर्यंत',
    benefitAmountHi: 'प्रति हेक्टेयर ₹2 लाख तक',
    popup: {
      howItHelps: [
        'Protects your income when crops are destroyed by floods, drought, hailstorm or pest attack',
        'Government pays 95-98% of the premium - farmer pays only 1.5% to 5%',
        'Claim money deposited directly into your bank account within 2 months',
        'Covers pre-sowing losses, standing crop losses and post-harvest losses',
      ],
      howItHelpsMr: [
        'पूर, दुष्काळ, गारपीट किंवा कीड हल्ल्याने पीक नष्ट झाल्यास तुमचे उत्पन्न सुरक्षित राहते',
        'सरकार ९५-९८% प्रीमियम भरते - शेतकऱ्याला फक्त १.५% ते ५% भरावे लागते',
        'दावा रक्कम २ महिन्यांत थेट बँक खात्यात जमा होते',
        'पेरणीपूर्व, उभे पीक आणि काढणीनंतरच्या नुकसानास कव्हर मिळते',
      ],
      realExample:
        'A farmer in Ahmednagar lost his entire sugarcane crop to hailstorm. He paid only ₹2,800 as premium and received ₹1,40,000 as compensation within 45 days.',
      realExampleMr:
        'अहमदनगरमधील एका शेतकऱ्याचे गारपिटीमुळे संपूर्ण ऊस पीक गेले. त्याने फक्त ₹२,८०० प्रीमियम भरला आणि ४५ दिवसांत ₹१,४०,००० नुकसानभरपाई मिळाली.',
      steps: [
        'Visit your nearest bank or CSC center before crop sowing deadline',
        'Carry Aadhaar card, bank passbook, and land records (7/12 extract)',
        'Fill the enrollment form and pay your share of premium',
        'Keep your enrollment receipt safe for claim filing',
      ],
      stepsMr: [
        'पेरणीच्या अंतिम तारखेपूर्वी जवळच्या बँक किंवा CSC केंद्रात जा',
        'आधार कार्ड, बँक पासबुक आणि जमीन नोंदी (७/१२ उतारा) सोबत आणा',
        'नोंदणी फॉर्म भरा आणि तुमचा प्रीमियम हिस्सा भरा',
        'दावा दाखल करण्यासाठी पावती सुरक्षित ठेवा',
      ],
      visualStats: [
        { label: 'Farmers Covered', value: '5.5 Crore+', icon: '👨‍🌾' },
        { label: 'Claims Paid', value: '₹1.5 Lakh Crore+', icon: '💰' },
        { label: 'Premium by Farmer', value: 'Only 1.5-5%', icon: '📉' },
        { label: 'Claim Time', value: 'Within 60 days', icon: '⏱️' },
      ],
    },
  },
  {
    id: 'pmkisan',
    name: 'PM Kisan Samman Nidhi',
    nameMr: 'पीएम किसान सन्मान निधी',
    nameHi: 'पीएम किसान सम्मान निधि',
    tagline: 'Direct Income Support',
    taglineMr: 'थेट उत्पन्न आधार',
    taglineHi: 'प्रत्यक्ष आय सहायता',
    description: '₹6,000 per year direct income support in 3 equal instalments',
    eligibility: 'Small and marginal farmers with cultivable land',
    url: 'https://pmkisan.gov.in',
    icon: '💰',
    color: '#854F0B',
    benefitAmount: '₹6,000 per year',
    benefitAmountMr: 'वर्षाला ₹६,०००',
    benefitAmountHi: 'प्रति वर्ष ₹6,000',
    popup: {
      howItHelps: [
        '₹2,000 deposited 3 times a year directly into your bank account - no middleman',
        'Money can be used for seeds, fertilizers, or any farming expenses',
        'No repayment required - this is a government grant not a loan',
        'Eligible farmers automatically receive every instalment',
      ],
      howItHelpsMr: [
        'वर्षातून ३ वेळा ₹२,००० थेट बँक खात्यात जमा - कोणताही मध्यस्थ नाही',
        'पैसे बियाणे, खते किंवा कोणत्याही शेती खर्चासाठी वापरता येतात',
        'परतफेड आवश्यक नाही - हे सरकारी अनुदान आहे, कर्ज नाही',
        'पात्र शेतकऱ्यांना आपोआप प्रत्येक हप्ता मिळतो',
      ],
      realExample:
        'Ramrao from Nanded receives ₹2,000 every 4 months. He uses the first instalment to buy seeds, the second for fertilizers, and the third for harvesting expenses.',
      realExampleMr:
        'नांदेडमधील रामराव यांना दर ४ महिन्यांनी ₹२,००० मिळतात. ते पहिला हप्ता बियाण्यांसाठी, दुसरा खतांसाठी आणि तिसरा काढणीच्या खर्चासाठी वापरतात.',
      steps: [
        'Register at pmkisan.gov.in or visit your nearest CSC center',
        'Carry Aadhaar card, bank passbook and land ownership documents',
        'After verification your name appears in the beneficiary list',
        'Money is credited automatically - check status on the PM Kisan app',
      ],
      stepsMr: [
        'pmkisan.gov.in वर नोंदणी करा किंवा जवळच्या CSC केंद्रात जा',
        'आधार कार्ड, बँक पासबुक आणि जमीन मालकी कागदपत्रे सोबत आणा',
        'पडताळणीनंतर तुमचे नाव लाभार्थी यादीत येते',
        'पैसे आपोआप जमा होतात - PM किसान अॅपवर स्थिती तपासा',
      ],
      visualStats: [
        { label: 'Beneficiary Farmers', value: '11 Crore+', icon: '👨‍🌾' },
        { label: 'Amount Per Year', value: '₹6,000', icon: '💵' },
        { label: 'Instalments', value: '3 per year', icon: '📅' },
        { label: 'Transfer Mode', value: 'Direct to Bank', icon: '🏦' },
      ],
    },
  },
  {
    id: 'soilhealth',
    name: 'Soil Health Card Scheme',
    nameMr: 'माती आरोग्य कार्ड योजना',
    nameHi: 'मृदा स्वास्थ्य कार्ड योजना',
    tagline: 'Free Soil Testing',
    taglineMr: 'मोफत माती परीक्षण',
    taglineHi: 'मुफ्त मिट्टी परीक्षण',
    description: 'Free soil testing and crop-wise nutrient recommendations every 2 years',
    eligibility: 'All farmers across India',
    url: 'https://soilhealth.dac.gov.in',
    icon: '🌱',
    color: '#085041',
    benefitAmount: 'Free every 2 years',
    benefitAmountMr: 'दर २ वर्षांनी मोफत',
    benefitAmountHi: 'हर 2 साल में मुफ्त',
    popup: {
      howItHelps: [
        'Know exactly which nutrients your soil is missing - stop wasting money on wrong fertilizers',
        'Get crop-specific recommendations - which fertilizer, how much, and when to apply',
        'Soil card shows pH level, nitrogen, phosphorus, potassium and micronutrient status',
        'Using the right fertilizer based on soil test can increase yield by 10-15%',
      ],
      howItHelpsMr: [
        'तुमच्या मातीत नक्की कोणते पोषक कमी आहेत ते जाणा - चुकीच्या खतांवर पैसे वाया घालवू नका',
        'पीक-विशिष्ट शिफारसी मिळवा - कोणते खत, किती आणि केव्हा द्यायचे',
        'माती कार्ड pH पातळी, नायट्रोजन, फॉस्फरस, पोटॅशियम आणि सूक्ष्म पोषक स्थिती दाखवते',
        'माती परीक्षणावर आधारित योग्य खत वापरून उत्पादन १०-१५% वाढू शकते',
      ],
      realExample:
        'Sunita from Pune discovered her soil had excess nitrogen but lacked potassium. By adjusting fertilizers she saved ₹8,000 on unnecessary urea and her onion yield increased by 18%.',
      realExampleMr:
        'पुण्याच्या सुनीताला कळले की तिच्या मातीत नायट्रोजन जास्त आहे पण पोटॅशियम कमी आहे. खते बदलून तिने अनावश्यक युरियावर ₹८,००० वाचवले आणि कांद्याचे उत्पादन १८% वाढले.',
      steps: [
        'Contact your local Krushi Vibhag office or visit a Soil Testing Laboratory',
        'Collect soil sample from 6 inches depth from 5-6 spots in your field',
        'Submit the sample - results come in 15-20 days',
        'Soil Health Card delivered to your home or available at Krushi Vibhag office',
      ],
      stepsMr: [
        'स्थानिक कृषी विभाग कार्यालयाशी संपर्क साधा किंवा माती परीक्षण प्रयोगशाळेत जा',
        'शेतातील ५-६ ठिकाणांहून ६ इंच खोलीतून माती नमुना गोळा करा',
        'नमुना सबमिट करा - निकाल १५-२० दिवसांत येतो',
        'माती आरोग्य कार्ड घरी पोहोचवले जाते किंवा कृषी विभाग कार्यालयात उपलब्ध असते',
      ],
      visualStats: [
        { label: 'Cards Issued', value: '23 Crore+', icon: '🪪' },
        { label: 'Cost to Farmer', value: '₹0 - Free', icon: '✅' },
        { label: 'Yield Increase', value: '10-15%', icon: '📈' },
        { label: 'Valid For', value: '2 Years', icon: '📅' },
      ],
    },
  },
  {
    id: 'pmksy',
    name: 'PM Krishi Sinchai Yojana',
    nameMr: 'पीएम कृषी सिंचन योजना',
    nameHi: 'पीएम कृषि सिंचाई योजना',
    tagline: 'Irrigation Subsidy',
    taglineMr: 'सिंचन अनुदान',
    taglineHi: 'सिंचाई सब्सिडी',
    description: 'Subsidy on drip and sprinkler irrigation - save water, grow more',
    eligibility: 'Farmers with own or leased agricultural land',
    url: 'https://pmksy.gov.in',
    icon: '💧',
    color: '#185FA5',
    benefitAmount: '55% subsidy for small farmers',
    benefitAmountMr: 'लहान शेतकऱ्यांना ५५% अनुदान',
    benefitAmountHi: 'छोटे किसानों को 55% सब्सिडी',
    popup: {
      howItHelps: [
        'Government pays 55% cost of drip irrigation for small farmers, 45% for others',
        'Drip irrigation saves 40-50% water compared to traditional flood irrigation',
        'Crops get water at roots - less disease, better growth, higher yield',
        'Fertilizers can be mixed with drip water - saves labour and increases efficiency',
      ],
      howItHelpsMr: [
        'लहान शेतकऱ्यांसाठी ठिबक सिंचनाचा ५५% खर्च सरकार देते, इतरांसाठी ४५%',
        'ठिबक सिंचनामुळे पारंपरिक पूर सिंचनाच्या तुलनेत ४०-५०% पाणी वाचते',
        'पिकांना मुळाशी पाणी मिळते - कमी रोग, चांगली वाढ, जास्त उत्पादन',
        'खते ठिबक पाण्यात मिसळता येतात - मजूर खर्च वाचतो आणि कार्यक्षमता वाढते',
      ],
      realExample:
        'Vitthal from Solapur installed drip irrigation on his 3 acres of pomegranate farm with 55% subsidy. His water use dropped by 45% and fruit yield increased by 22%. He recovered full investment in 2 seasons.',
      realExampleMr:
        'सोलापूरचे विठ्ठल यांनी ५५% अनुदानावर त्यांच्या ३ एकर डाळिंब शेतात ठिबक सिंचन बसवले. पाण्याचा वापर ४५% कमी झाला आणि फळांचे उत्पादन २२% वाढले. २ हंगामांत संपूर्ण गुंतवणूक वसूल झाली.',
      steps: [
        'Apply through MahaDBT portal at mahadbt.maharashtra.gov.in',
        'Select PMKSY scheme and fill your land and bank details',
        'Get approval letter and then purchase from approved vendor',
        'After installation upload photos and invoice for subsidy release',
      ],
      stepsMr: [
        'mahadbt.maharashtra.gov.in वर MahaDBT पोर्टलद्वारे अर्ज करा',
        'PMKSY योजना निवडा आणि जमीन व बँक तपशील भरा',
        'मंजुरी पत्र मिळवा आणि मग मान्यताप्राप्त विक्रेत्याकडून खरेदी करा',
        'स्थापनेनंतर अनुदान मिळवण्यासाठी फोटो आणि बीजक अपलोड करा',
      ],
      visualStats: [
        { label: 'Subsidy Amount', value: '45-55%', icon: '💸' },
        { label: 'Water Saved', value: '40-50%', icon: '💧' },
        { label: 'Yield Increase', value: 'Up to 22%', icon: '📈' },
        { label: 'Crops Covered', value: 'All crops', icon: '🌾' },
      ],
    },
  },
  {
    id: 'mahadbt',
    name: 'MahaDBT Farmer Schemes',
    nameMr: 'महाडीबीटी शेतकरी योजना',
    nameHi: 'महाडीबीटी किसान योजनाएं',
    tagline: 'Maharashtra Subsidy Portal',
    taglineMr: 'महाराष्ट्र अनुदान पोर्टल',
    taglineHi: 'महाराष्ट्र सब्सिडी पोर्टल',
    description: 'Single portal for all Maharashtra farm equipment and input subsidies',
    eligibility: 'Maharashtra resident farmers with 7/12 extract',
    url: 'https://mahadbt.maharashtra.gov.in',
    icon: '🏛️',
    color: '#534AB7',
    benefitAmount: 'Multiple schemes - up to ₹1.5 lakh',
    benefitAmountMr: 'अनेक योजना - ₹१.५ लाखांपर्यंत',
    benefitAmountHi: 'अनेक योजनाएं - ₹1.5 लाख तक',
    popup: {
      howItHelps: [
        'Single portal for 40+ Maharashtra government schemes for farmers',
        'Subsidies available for tractors, power tillers, sprayers, seed drills and more',
        'Apply online from home - no need to visit multiple government offices',
        'Track your application status in real time on the portal',
      ],
      howItHelpsMr: [
        'शेतकऱ्यांसाठी ४०+ महाराष्ट्र सरकारी योजनांचे एकच पोर्टल',
        'ट्रॅक्टर, पॉवर टिलर, फवारणी यंत्र, सीड ड्रिल आणि बरेच काही यावर अनुदान उपलब्ध',
        'घरून ऑनलाइन अर्ज करा - अनेक सरकारी कार्यालयांना भेट देण्याची गरज नाही',
        'पोर्टलवर रिअल टाइममध्ये अर्जाची स्थिती ट्रॅक करा',
      ],
      realExample:
        'Baburao from Nagpur applied for a power tiller subsidy through MahaDBT. He got 50% subsidy worth ₹85,000 on a ₹1,70,000 power tiller. Application to payment took only 3 weeks.',
      realExampleMr:
        'नागपूरच्या बाबुराव यांनी MahaDBT द्वारे पॉवर टिलर अनुदानासाठी अर्ज केला. त्यांना ₹१,७०,००० च्या पॉवर टिलरवर ₹८५,००० किमतीचे ५०% अनुदान मिळाले. अर्जापासून पेमेंटपर्यंत फक्त ३ आठवडे लागले.',
      steps: [
        'Register at mahadbt.maharashtra.gov.in with your Aadhaar number',
        'Browse available schemes under Krushi Vibhag section',
        'Select scheme, fill form and upload required documents',
        'After approval purchase equipment and upload invoice for payment',
      ],
      stepsMr: [
        'तुमच्या आधार क्रमांकासह mahadbt.maharashtra.gov.in वर नोंदणी करा',
        'कृषी विभाग विभागांतर्गत उपलब्ध योजना पहा',
        'योजना निवडा, फॉर्म भरा आणि आवश्यक कागदपत्रे अपलोड करा',
        'मंजुरीनंतर उपकरण खरेदी करा आणि पेमेंटसाठी बीजक अपलोड करा',
      ],
      visualStats: [
        { label: 'Schemes Available', value: '40+', icon: '📋' },
        { label: 'Max Subsidy', value: 'Up to ₹1.5L', icon: '💰' },
        { label: 'Application Mode', value: '100% Online', icon: '💻' },
        { label: 'Districts Covered', value: 'All 36', icon: '🗺️' },
      ],
    },
  },
  {
    id: 'namoshetkari',
    name: 'Namo Shetkari Maha Samman',
    nameMr: 'नमो शेतकरी महा सन्मान',
    nameHi: 'नमो शेतकरी महा सम्मान',
    tagline: 'Maharashtra Bonus Support',
    taglineMr: 'महाराष्ट्र बोनस आधार',
    taglineHi: 'महाराष्ट्र बोनस सहायता',
    description: 'Maharashtra state additional ₹6,000 per year on top of PM Kisan',
    eligibility: 'Farmers registered under PM Kisan in Maharashtra',
    url: 'https://krishi.maharashtra.gov.in',
    icon: '🏆',
    color: '#993C1D',
    benefitAmount: '₹6,000 extra per year',
    benefitAmountMr: 'दरवर्षी अतिरिक्त ₹६,०००',
    benefitAmountHi: 'प्रति वर्ष ₹6,000 अतिरिक्त',
    popup: {
      howItHelps: [
        'Maharashtra farmers registered in PM Kisan automatically get this extra ₹6,000',
        'Combined with PM Kisan you receive ₹12,000 per year total - ₹1,000 per month',
        'No separate application needed if already in PM Kisan - automatic enrollment',
        'Money deposited directly to bank account in 3 instalments of ₹2,000 each',
      ],
      howItHelpsMr: [
        'PM किसानमध्ये नोंदणीकृत महाराष्ट्र शेतकऱ्यांना हे अतिरिक्त ₹६,००० आपोआप मिळतात',
        'PM किसानसह एकत्र वर्षाला एकूण ₹१२,००० मिळतात - महिन्याला ₹१,०००',
        'PM किसानमध्ये आधीच असल्यास स्वतंत्र अर्ज आवश्यक नाही - आपोआप नोंदणी',
        'प्रत्येकी ₹२,००० च्या ३ हप्त्यांमध्ये थेट बँक खात्यात पैसे जमा होतात',
      ],
      realExample:
        'Laxmibai from Kolhapur was already getting ₹6,000 from PM Kisan. After Namo Shetkari scheme launched she started receiving an additional ₹6,000 - now she gets ₹12,000 per year without any extra paperwork.',
      realExampleMr:
        'कोल्हापूरच्या लक्ष्मीबाई यांना PM किसानमधून आधीच ₹६,००० मिळत होते. नमो शेतकरी योजना सुरू झाल्यावर त्यांना अतिरिक्त ₹६,००० मिळू लागले - आता त्यांना कोणत्याही अतिरिक्त कागदपत्रांशिवाय वर्षाला ₹१२,००० मिळतात.',
      steps: [
        'If already registered in PM Kisan - nothing to do, automatic enrollment',
        'If not in PM Kisan - register at pmkisan.gov.in first',
        'Ensure your Aadhaar is linked to your bank account',
        'Check payment status at krishi.maharashtra.gov.in',
      ],
      stepsMr: [
        'आधीच PM किसानमध्ये नोंदणीकृत असल्यास - काहीही करण्याची गरज नाही, आपोआप नोंदणी',
        'PM किसानमध्ये नसल्यास - आधी pmkisan.gov.in वर नोंदणी करा',
        'तुमचे आधार बँक खात्याशी लिंक असल्याची खात्री करा',
        'krishi.maharashtra.gov.in वर पेमेंट स्थिती तपासा',
      ],
      visualStats: [
        { label: 'Extra Per Year', value: '₹6,000', icon: '➕' },
        { label: 'Total with PM Kisan', value: '₹12,000', icon: '💰' },
        { label: 'Separate Form', value: 'Not Needed', icon: '✅' },
        { label: 'Instalments', value: '3 per year', icon: '📅' },
      ],
    },
  },
];

const KrushiVibhag = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const [selectedDistrict, setSelectedDistrict] = useState<string>('Pune');
  const [selectedScheme, setSelectedScheme] = useState<SchemeData | null>(null);

  const officeDirectory = useMemo(
    () => Object.fromEntries(DISTRICT_OFFICES.map((office) => [office.district, office])) as Record<string, DistrictOffice>,
    []
  );

  const slideshowSlides = useMemo(
    () => [
      { src: '/plant-images/sugarcane.jpg', captionKey: 'slideshow.slide1' },
      { src: '/plant-images/oninon.jpg', captionKey: 'slideshow.slide2' },
      { src: '/plant-images/tomato.jpg', captionKey: 'slideshow.slide3' },
      { src: '/plant-images/turmeric.jpg', captionKey: 'slideshow.slide4' },
      { src: '/plant-images/Mango.jpg', captionKey: 'slideshow.slide5' },
    ],
    []
  );

  const selectedOffice = officeDirectory[selectedDistrict];

  const openMaps = (office: DistrictOffice) => {
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(office.maps)}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className="krushi-vibhag-layout">
      <section className="card krushi-hero">
        <div className="krushi-hero__copy">
          <span className="pill">{t('krushiVibhag.govBadge')}</span>
          <p className="subtitle">{t('krushiVibhag.title')}</p>
          <h1 className="headline">{t('krushiVibhag.heroHeading')}</h1>
          <p className="lead">{t('krushiVibhag.heroSubtext')}</p>
        </div>
        <FarmSlideshow
          slides={slideshowSlides}
          title={t('krushiVibhag.slideshowTitle')}
          prevLabel={t('krushiVibhag.slideshowPrev')}
          nextLabel={t('krushiVibhag.slideshowNext')}
          dotLabel={t('krushiVibhag.slideshowDots')}
        />
      </section>

      <section className="card section-block">
        <div className="section-title-row">
          <h2>{t('krushiVibhag.aboutTitle')}</h2>
        </div>
        <p className="lead">{t('krushiVibhag.aboutLead')}</p>
        <p className="lead">{t('krushiVibhag.aboutBody')}</p>

        <div className="krushi-three-grid">
          <article className="feature-card">
            <div className="feature-icon">DO</div>
            <h3>{t('krushiVibhag.roles.districtOfficer.title')}</h3>
            <p>{t('krushiVibhag.roles.districtOfficer.desc')}</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">TS</div>
            <h3>{t('krushiVibhag.roles.talukaSupervisor.title')}</h3>
            <p>{t('krushiVibhag.roles.talukaSupervisor.desc')}</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">VEW</div>
            <h3>{t('krushiVibhag.roles.villageWorker.title')}</h3>
            <p>{t('krushiVibhag.roles.villageWorker.desc')}</p>
          </article>
        </div>
      </section>

      <section className="card section-block">
        <div className="section-title-row">
          <h2>{t('krushiVibhag.helpTitle')}</h2>
        </div>
        <div className="krushi-benefits-grid">
          <article className="impact-card">
            <strong>{t('krushiVibhag.benefits.soilTesting.title')}</strong>
            <p>{t('krushiVibhag.benefits.soilTesting.desc')}</p>
          </article>
          <article className="impact-card">
            <strong>{t('krushiVibhag.benefits.seedSubsidy.title')}</strong>
            <p>{t('krushiVibhag.benefits.seedSubsidy.desc')}</p>
          </article>
          <article className="impact-card">
            <strong>{t('krushiVibhag.benefits.insurance.title')}</strong>
            <p>{t('krushiVibhag.benefits.insurance.desc')}</p>
          </article>
          <article className="impact-card">
            <strong>{t('krushiVibhag.benefits.disaster.title')}</strong>
            <p>{t('krushiVibhag.benefits.disaster.desc')}</p>
          </article>
        </div>
      </section>

      <section className="card section-block">
        <div className="section-title-row">
          <h2>{t('krushiVibhag.schemesTitle')}</h2>
        </div>
        <div className="krushi-schemes-grid">
          {SCHEMES.map((scheme) => (
            <article key={scheme.id} className={`krushi-scheme-card krushi-scheme-card--${scheme.id}`}>
              <header>
                <h3>{language.startsWith('mr') ? scheme.nameMr : language.startsWith('hi') ? scheme.nameHi : scheme.name}</h3>
              </header>
              <div className="krushi-scheme-card__body">
                <p>{scheme.description}</p>
                <span className="pill">{scheme.eligibility}</span>
                <button type="button" className="btn outline" onClick={() => setSelectedScheme(scheme)}>
                  {t('krushiVibhag.knowMore')}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card section-block">
        <div className="section-title-row">
          <h2>{t('krushiVibhag.contactTitle')}</h2>
        </div>

        <div className="krushi-office-grid">
          <div className="krushi-office-selector">
            <label className="field-label" htmlFor="krushi-district-select">
              {t('krushiVibhag.selectDistrict')}
            </label>
            <select
              id="krushi-district-select"
              className="input"
              value={selectedDistrict}
              onChange={(event) => setSelectedDistrict(event.target.value)}
            >
              {MAHARASHTRA_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {localizeDistrictName(district, language)}
                </option>
              ))}
            </select>
          </div>

          {selectedOffice ? (
            <article className="krushi-office-card">
              <h3>
                {t('krushiVibhag.officeHeading', {
                  district: localizeDistrictName(selectedDistrict, language),
                })}
              </h3>
              <p>
                <strong>{t('krushiVibhag.addressLabel')}:</strong> {selectedOffice.address}
              </p>
              <p>
                <strong>{t('krushiVibhag.phoneLabel')}:</strong>{' '}
                <a href={`tel:${selectedOffice.phone.replace(/[^0-9+]/g, '')}`}>{selectedOffice.phone}</a>
              </p>
              <p>
                <strong>{t('krushiVibhag.officeHoursLabel')}:</strong> {t('krushiVibhag.officeHours')}
              </p>

              <a
                href={`tel:${selectedOffice.phone.replace(/[^0-9+]/g, '')}`}
                className="btn primary call-office-btn"
              >
                📞 {t('krushiVibhag.callOffice')}
              </a>

              <button type="button" className="btn primary" onClick={() => openMaps(selectedOffice)}>
                {t('krushiVibhag.getDirections')}
              </button>
            </article>
          ) : null}
        </div>
      </section>

      <section className="card krushi-helpline">
        <h2>{t('krushiVibhag.helplineTitle')}</h2>
        <p>
          <a href="tel:18001801551">{t('krushiVibhag.helplines.kisanCallCenter')}</a>
        </p>
        <p>
          <a href="tel:18002334000">{t('krushiVibhag.helplines.stateLine')}</a>
        </p>
        <p className="lead">{t('krushiVibhag.helplineHours')}</p>
      </section>

      {selectedScheme ? (
        <SchemePopup
          scheme={selectedScheme}
          language={language}
          onClose={() => setSelectedScheme(null)}
        />
      ) : null}
    </div>
  );
};

export default KrushiVibhag;
