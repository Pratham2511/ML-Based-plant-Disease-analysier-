import math
import re
from datetime import datetime
from threading import Lock
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.crop_recommendation import CropRecommendation
from app.models.soil_report import SoilReport

MAHARASHTRA_STATE = "Maharashtra"

MAHARASHTRA_DISTRICTS = [
    "Ahmednagar",
    "Akola",
    "Amravati",
    "Aurangabad",
    "Beed",
    "Bhandara",
    "Buldhana",
    "Chandrapur",
    "Dhule",
    "Gadchiroli",
    "Gondia",
    "Hingoli",
    "Jalgaon",
    "Jalna",
    "Kolhapur",
    "Latur",
    "Mumbai City",
    "Mumbai Suburban",
    "Nagpur",
    "Nanded",
    "Nandurbar",
    "Nashik",
    "Osmanabad",
    "Palghar",
    "Parbhani",
    "Pune",
    "Raigad",
    "Ratnagiri",
    "Sangli",
    "Satara",
    "Sindhudurg",
    "Solapur",
    "Thane",
    "Wardha",
    "Washim",
    "Yavatmal",
]

DISTRICT_CENTROIDS = {
    "Ahmednagar": (19.0952, 74.7496),
    "Akola": (20.7096, 77.0082),
    "Amravati": (20.9374, 77.7796),
    "Aurangabad": (19.8762, 75.3433),
    "Beed": (18.9891, 75.7601),
    "Bhandara": (21.1702, 79.6558),
    "Buldhana": (20.5293, 76.1848),
    "Chandrapur": (19.9615, 79.2961),
    "Dhule": (20.9042, 74.7749),
    "Gadchiroli": (20.1809, 80.0158),
    "Gondia": (21.4602, 80.1961),
    "Hingoli": (19.7146, 77.1483),
    "Jalgaon": (21.0077, 75.5626),
    "Jalna": (19.8347, 75.8816),
    "Kolhapur": (16.7050, 74.2433),
    "Latur": (18.4088, 76.5604),
    "Mumbai City": (18.9388, 72.8354),
    "Mumbai Suburban": (19.1391, 72.9515),
    "Nagpur": (21.1458, 79.0882),
    "Nanded": (19.1383, 77.3210),
    "Nandurbar": (21.3650, 74.2400),
    "Nashik": (19.9975, 73.7898),
    "Osmanabad": (18.1861, 76.0419),
    "Palghar": (19.6967, 72.7699),
    "Parbhani": (19.2608, 76.7748),
    "Pune": (18.5204, 73.8567),
    "Raigad": (18.5158, 73.1822),
    "Ratnagiri": (16.9902, 73.3120),
    "Sangli": (16.8524, 74.5815),
    "Satara": (17.6805, 74.0183),
    "Sindhudurg": (16.3492, 73.5594),
    "Solapur": (17.6599, 75.9064),
    "Thane": (19.2183, 72.9781),
    "Wardha": (20.7453, 78.6022),
    "Washim": (20.1110, 77.1360),
    "Yavatmal": (20.3888, 78.1307),
}

SOIL_PROFILES = {
    "black_cotton": {
        "soil_type": "Black Cotton Soil",
        "ph_level": "6.5 - 7.8",
        "nitrogen_level": "Moderate",
        "phosphorus_level": "Low",
        "potassium_level": "High",
        "organic_matter": "Medium",
        "moisture_retention": "High",
        "drainage_capacity": "Moderate",
    },
    "alluvial_loam": {
        "soil_type": "Alluvial Loam Soil",
        "ph_level": "6.2 - 7.4",
        "nitrogen_level": "Medium",
        "phosphorus_level": "Medium",
        "potassium_level": "Medium",
        "organic_matter": "Medium",
        "moisture_retention": "Moderate",
        "drainage_capacity": "Good",
    },
    "coastal_alluvial": {
        "soil_type": "Coastal Alluvial Soil",
        "ph_level": "5.8 - 7.2",
        "nitrogen_level": "Low",
        "phosphorus_level": "Medium",
        "potassium_level": "Medium",
        "organic_matter": "High",
        "moisture_retention": "High",
        "drainage_capacity": "Moderate",
    },
    "red_lateritic": {
        "soil_type": "Red and Lateritic Soil",
        "ph_level": "5.6 - 6.8",
        "nitrogen_level": "Low",
        "phosphorus_level": "Low",
        "potassium_level": "Moderate",
        "organic_matter": "Low",
        "moisture_retention": "Moderate",
        "drainage_capacity": "High",
    },
}

DISTRICT_TO_PROFILE = {
    "Ahmednagar": "black_cotton",
    "Akola": "black_cotton",
    "Amravati": "black_cotton",
    "Aurangabad": "black_cotton",
    "Beed": "black_cotton",
    "Bhandara": "alluvial_loam",
    "Buldhana": "black_cotton",
    "Chandrapur": "red_lateritic",
    "Dhule": "alluvial_loam",
    "Gadchiroli": "red_lateritic",
    "Gondia": "alluvial_loam",
    "Hingoli": "black_cotton",
    "Jalgaon": "alluvial_loam",
    "Jalna": "black_cotton",
    "Kolhapur": "alluvial_loam",
    "Latur": "black_cotton",
    "Mumbai City": "coastal_alluvial",
    "Mumbai Suburban": "coastal_alluvial",
    "Nagpur": "black_cotton",
    "Nanded": "black_cotton",
    "Nandurbar": "alluvial_loam",
    "Nashik": "alluvial_loam",
    "Osmanabad": "black_cotton",
    "Palghar": "coastal_alluvial",
    "Parbhani": "black_cotton",
    "Pune": "black_cotton",
    "Raigad": "coastal_alluvial",
    "Ratnagiri": "red_lateritic",
    "Sangli": "black_cotton",
    "Satara": "black_cotton",
    "Sindhudurg": "red_lateritic",
    "Solapur": "black_cotton",
    "Thane": "coastal_alluvial",
    "Wardha": "black_cotton",
    "Washim": "black_cotton",
    "Yavatmal": "black_cotton",
}

SOIL_PRIORITY_CROPS = {
    "Black Cotton Soil": [
        "Cotton",
        "Soybean",
        "Sorghum (Jowar)",
        "Pigeon Pea (Tur)",
        "Chickpea",
        "Wheat",
        "Onion",
        "Tomato",
        "Groundnut",
        "Sunflower",
        "Pomegranate",
        "Grapes",
    ],
    "Alluvial Loam Soil": [
        "Tomato",
        "Onion",
        "Potato",
        "Maize",
        "Rice",
        "Sugarcane",
        "Banana",
        "Papaya",
        "Guava",
        "Chili",
        "Garlic",
        "Turmeric",
    ],
    "Coastal Alluvial Soil": [
        "Rice",
        "Banana",
        "Papaya",
        "Mango",
        "Guava",
        "Turmeric",
        "Ginger",
        "Chili",
        "Maize",
        "Groundnut",
        "Tomato",
        "Onion",
    ],
    "Red and Lateritic Soil": [
        "Rice",
        "Groundnut",
        "Turmeric",
        "Ginger",
        "Maize",
        "Mustard",
        "Sunflower",
        "Pigeon Pea (Tur)",
        "Green Gram (Moong)",
        "Black Gram (Urad)",
        "Mango",
        "Cashew",
    ],
}

CROP_CATALOG: List[Dict[str, Any]] = [
    {
        "crop_name": "Tomato",
        "scientific_name": "Solanum lycopersicum",
        "crop_image": "/plant-images/tomato.jpg",
        "soil_type": "Loamy Soil",
        "temperature_range": "18-27 C",
        "rainfall_requirement": "600-800 mm",
        "water_requirement": "600-800 mm per season",
        "growing_season": "Winter / Summer",
        "growth_duration": "90-120 days",
        "seed_rate": "100-150 g per acre",
        "fertilizer_recommendation": "Balanced NPK with compost",
        "disease_risk": "High",
        "market_demand": "High",
        "expected_yield": "20-25 tons per hectare",
        "planting_method": "Nursery transplanting",
        "irrigation_schedule": "Every 4-6 days during vegetative stage",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Early Blight", "Leaf Curl Virus", "Late Blight"],
        "disease_prevention": "Use disease-free seedlings and avoid overhead irrigation.",
        "market_price_range": "INR 12-35 per kg",
    },
    {
        "crop_name": "Onion",
        "scientific_name": "Allium cepa",
        "crop_image": "/plant-images/oninon.jpg",
        "soil_type": "Sandy Loam",
        "temperature_range": "13-24 C",
        "rainfall_requirement": "500-700 mm",
        "water_requirement": "350-550 mm per season",
        "growing_season": "Rabi / Kharif",
        "growth_duration": "100-150 days",
        "seed_rate": "3-4 kg per acre",
        "fertilizer_recommendation": "Nitrogen split doses with sulfur",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "18-22 tons per hectare",
        "planting_method": "Seedling transplanting",
        "irrigation_schedule": "Every 7-10 days depending on soil moisture",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Purple Blotch", "Stemphylium Blight"],
        "disease_prevention": "Ensure crop rotation and avoid water stagnation.",
        "market_price_range": "INR 14-30 per kg",
    },
    {
        "crop_name": "Potato",
        "scientific_name": "Solanum tuberosum",
        "crop_image": "/plant-images/Potato.jpg",
        "soil_type": "Sandy Loam",
        "temperature_range": "15-22 C",
        "rainfall_requirement": "500-700 mm",
        "water_requirement": "500-700 mm per season",
        "growing_season": "Winter",
        "growth_duration": "90-120 days",
        "seed_rate": "700-900 kg seed tubers per acre",
        "fertilizer_recommendation": "FYM plus NPK with potash emphasis",
        "disease_risk": "High",
        "market_demand": "High",
        "expected_yield": "20-30 tons per hectare",
        "planting_method": "Tuber planting on ridges",
        "irrigation_schedule": "Every 5-7 days during tuber bulking",
        "irrigation_method": "Sprinkler Irrigation",
        "common_diseases": ["Late Blight", "Early Blight", "Black Scurf"],
        "disease_prevention": "Use certified seed tubers and preventive fungicide spray.",
        "market_price_range": "INR 10-26 per kg",
    },
    {
        "crop_name": "Soybean",
        "scientific_name": "Glycine max",
        "crop_image": "/plant-images/soyabeen.jpg",
        "soil_type": "Black Cotton Soil",
        "temperature_range": "20-30 C",
        "rainfall_requirement": "450-700 mm",
        "water_requirement": "450-700 mm per season",
        "growing_season": "Kharif",
        "growth_duration": "90-110 days",
        "seed_rate": "25-30 kg per acre",
        "fertilizer_recommendation": "DAP with sulfur and Rhizobium inoculation",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "1.8-2.5 tons per hectare",
        "planting_method": "Direct line sowing",
        "irrigation_schedule": "Mostly rainfed; one life irrigation in dry spells",
        "irrigation_method": "Sprinkler Irrigation",
        "common_diseases": ["Rust", "Yellow Mosaic Virus"],
        "disease_prevention": "Timely sowing and resistant varieties.",
        "market_price_range": "INR 4300-5200 per quintal",
    },
    {
        "crop_name": "Cotton",
        "scientific_name": "Gossypium hirsutum",
        "crop_image": "/plant-images/cotton.jpg",
        "soil_type": "Black Cotton Soil",
        "temperature_range": "21-30 C",
        "rainfall_requirement": "700-1300 mm",
        "water_requirement": "700-1300 mm per season",
        "growing_season": "Kharif",
        "growth_duration": "150-180 days",
        "seed_rate": "1-1.5 kg hybrid seed per acre",
        "fertilizer_recommendation": "NPK with micronutrient spray",
        "disease_risk": "High",
        "market_demand": "High",
        "expected_yield": "18-25 quintals kapas per hectare",
        "planting_method": "Direct dibbling",
        "irrigation_schedule": "Every 10-14 days after flowering",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Wilt", "Bacterial Blight", "Leaf Curl"],
        "disease_prevention": "Adopt IPM and avoid water stress.",
        "market_price_range": "INR 6200-7600 per quintal",
    },
    {
        "crop_name": "Sugarcane",
        "scientific_name": "Saccharum officinarum",
        "crop_image": "/plant-images/sugarcane.jpg",
        "soil_type": "Loamy Soil",
        "temperature_range": "20-35 C",
        "rainfall_requirement": "1000-1500 mm",
        "water_requirement": "1500-2500 mm per season",
        "growing_season": "Spring / Adsali",
        "growth_duration": "300-360 days",
        "seed_rate": "35,000-45,000 setts per acre",
        "fertilizer_recommendation": "High nitrogen and potash with press mud",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "80-120 tons per hectare",
        "planting_method": "Setts in furrows",
        "irrigation_schedule": "Every 7-12 days depending on growth stage",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Red Rot", "Smut", "Wilt"],
        "disease_prevention": "Use treated seed setts and field sanitation.",
        "market_price_range": "INR 2900-3500 per ton",
    },
    {
        "crop_name": "Wheat",
        "scientific_name": "Triticum aestivum",
        "crop_image": "/plant-images/wheat.jpg",
        "soil_type": "Alluvial Loam Soil",
        "temperature_range": "15-25 C",
        "rainfall_requirement": "450-650 mm",
        "water_requirement": "450-650 mm per season",
        "growing_season": "Rabi",
        "growth_duration": "110-140 days",
        "seed_rate": "40-50 kg per acre",
        "fertilizer_recommendation": "NPK with zinc in deficient soils",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "3.5-5 tons per hectare",
        "planting_method": "Line sowing",
        "irrigation_schedule": "4-6 irrigations at critical stages",
        "irrigation_method": "Sprinkler Irrigation",
        "common_diseases": ["Rust", "Powdery Mildew"],
        "disease_prevention": "Seed treatment and resistant cultivars.",
        "market_price_range": "INR 2200-2800 per quintal",
    },
    {
        "crop_name": "Rice",
        "scientific_name": "Oryza sativa",
        "crop_image": "/plant-images/Rice.jpg",
        "soil_type": "Clay Loam",
        "temperature_range": "20-35 C",
        "rainfall_requirement": "1200-1500 mm",
        "water_requirement": "1200-1500 mm per season",
        "growing_season": "Kharif",
        "growth_duration": "110-150 days",
        "seed_rate": "8-12 kg per acre",
        "fertilizer_recommendation": "Split nitrogen with phosphorus basal dose",
        "disease_risk": "High",
        "market_demand": "High",
        "expected_yield": "4-6 tons per hectare",
        "planting_method": "Nursery transplanting / direct seeded",
        "irrigation_schedule": "Maintain shallow standing water",
        "irrigation_method": "Flood Irrigation",
        "common_diseases": ["Blast", "Bacterial Leaf Blight", "Sheath Blight"],
        "disease_prevention": "Use healthy seedlings and balanced fertilization.",
        "market_price_range": "INR 2100-3200 per quintal",
    },
    {
        "crop_name": "Maize",
        "scientific_name": "Zea mays",
        "crop_image": "/plant-images/Maize.jpg",
        "soil_type": "Well-drained Loam",
        "temperature_range": "18-32 C",
        "rainfall_requirement": "500-800 mm",
        "water_requirement": "500-800 mm per season",
        "growing_season": "Kharif / Rabi",
        "growth_duration": "95-120 days",
        "seed_rate": "8-10 kg per acre",
        "fertilizer_recommendation": "High nitrogen with basal phosphorus",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "4-7 tons per hectare",
        "planting_method": "Line sowing",
        "irrigation_schedule": "Every 8-10 days at tasseling and grain fill",
        "irrigation_method": "Sprinkler Irrigation",
        "common_diseases": ["Turcicum Leaf Blight", "Downy Mildew"],
        "disease_prevention": "Seed treatment and field drainage management.",
        "market_price_range": "INR 1800-2600 per quintal",
    },
    {
        "crop_name": "Chickpea",
        "scientific_name": "Cicer arietinum",
        "crop_image": "/plant-images/chickpea.jpg",
        "soil_type": "Clay Loam",
        "temperature_range": "15-30 C",
        "rainfall_requirement": "400-600 mm",
        "water_requirement": "250-400 mm per season",
        "growing_season": "Rabi",
        "growth_duration": "100-130 days",
        "seed_rate": "25-35 kg per acre",
        "fertilizer_recommendation": "Phosphorus-rich basal dose with biofertilizer",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "1.5-2.2 tons per hectare",
        "planting_method": "Direct line sowing",
        "irrigation_schedule": "One to two irrigations at flowering/pod stage",
        "irrigation_method": "Sprinkler Irrigation",
        "common_diseases": ["Fusarium Wilt", "Ascochyta Blight"],
        "disease_prevention": "Use wilt-resistant varieties and seed treatment.",
        "market_price_range": "INR 5000-6500 per quintal",
    },
    {
        "crop_name": "Pigeon Pea (Tur)",
        "scientific_name": "Cajanus cajan",
        "crop_image": "/plant-images/piegoan-pea.jpg",
        "soil_type": "Black Cotton Soil",
        "temperature_range": "20-35 C",
        "rainfall_requirement": "600-1000 mm",
        "water_requirement": "450-650 mm per season",
        "growing_season": "Kharif",
        "growth_duration": "150-210 days",
        "seed_rate": "6-8 kg per acre",
        "fertilizer_recommendation": "Phosphorus and sulfur at sowing",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "1.2-2 tons per hectare",
        "planting_method": "Direct sowing",
        "irrigation_schedule": "Mostly rainfed, one irrigation at flowering in dry years",
        "irrigation_method": "Sprinkler Irrigation",
        "common_diseases": ["Wilt", "Sterility Mosaic"],
        "disease_prevention": "Resistant varieties and rouging infected plants.",
        "market_price_range": "INR 6000-8200 per quintal",
    },
    {
        "crop_name": "Groundnut",
        "scientific_name": "Arachis hypogaea",
        "crop_image": "/plant-images/Groundnut.jpg",
        "soil_type": "Sandy Loam",
        "temperature_range": "20-30 C",
        "rainfall_requirement": "500-1000 mm",
        "water_requirement": "500-700 mm per season",
        "growing_season": "Kharif / Summer",
        "growth_duration": "100-120 days",
        "seed_rate": "35-45 kg per acre",
        "fertilizer_recommendation": "Gypsum and balanced NPK",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "2-3 tons pods per hectare",
        "planting_method": "Direct sowing in rows",
        "irrigation_schedule": "At flowering, pegging and pod development",
        "irrigation_method": "Sprinkler Irrigation",
        "common_diseases": ["Tikka Leaf Spot", "Rust"],
        "disease_prevention": "Seed treatment and scheduled fungicide sprays.",
        "market_price_range": "INR 5200-7200 per quintal",
    },
    {
        "crop_name": "Sunflower",
        "scientific_name": "Helianthus annuus",
        "crop_image": "/plant-images/Sunflower.jpg",
        "soil_type": "Well-drained Loam",
        "temperature_range": "18-30 C",
        "rainfall_requirement": "500-700 mm",
        "water_requirement": "500-700 mm per season",
        "growing_season": "Kharif / Rabi",
        "growth_duration": "85-110 days",
        "seed_rate": "2-3 kg per acre",
        "fertilizer_recommendation": "Nitrogen and sulfur with micronutrients",
        "disease_risk": "Moderate",
        "market_demand": "Medium",
        "expected_yield": "1.5-2.5 tons per hectare",
        "planting_method": "Line sowing",
        "irrigation_schedule": "Critical irrigation at flowering and seed fill",
        "irrigation_method": "Sprinkler Irrigation",
        "common_diseases": ["Alternaria Blight", "Downy Mildew"],
        "disease_prevention": "Crop rotation and timely fungicide program.",
        "market_price_range": "INR 4500-6200 per quintal",
    },
    {
        "crop_name": "Mustard",
        "scientific_name": "Brassica juncea",
        "crop_image": "/plant-images/mustard.jpg",
        "soil_type": "Loamy Soil",
        "temperature_range": "10-25 C",
        "rainfall_requirement": "350-500 mm",
        "water_requirement": "300-450 mm per season",
        "growing_season": "Rabi",
        "growth_duration": "95-120 days",
        "seed_rate": "1.5-2 kg per acre",
        "fertilizer_recommendation": "Nitrogen and sulfur application",
        "disease_risk": "Low",
        "market_demand": "Medium",
        "expected_yield": "1.2-1.8 tons per hectare",
        "planting_method": "Line sowing",
        "irrigation_schedule": "2-3 irrigations at branching and pod filling",
        "irrigation_method": "Sprinkler Irrigation",
        "common_diseases": ["White Rust", "Alternaria Blight"],
        "disease_prevention": "Use certified seeds and avoid overcrowding.",
        "market_price_range": "INR 5000-6400 per quintal",
    },
    {
        "crop_name": "Sorghum (Jowar)",
        "scientific_name": "Sorghum bicolor",
        "crop_image": "/plant-images/jowar.jpg",
        "soil_type": "Black Cotton Soil",
        "temperature_range": "25-32 C",
        "rainfall_requirement": "400-700 mm",
        "water_requirement": "400-650 mm per season",
        "growing_season": "Kharif / Rabi",
        "growth_duration": "95-120 days",
        "seed_rate": "4-6 kg per acre",
        "fertilizer_recommendation": "NPK with zinc for deficient soils",
        "disease_risk": "Low",
        "market_demand": "Medium",
        "expected_yield": "2.5-4 tons per hectare",
        "planting_method": "Line sowing",
        "irrigation_schedule": "One protective irrigation at flowering",
        "irrigation_method": "Sprinkler Irrigation",
        "common_diseases": ["Grain Mold", "Anthracnose"],
        "disease_prevention": "Use tolerant hybrids and proper spacing.",
        "market_price_range": "INR 2200-3200 per quintal",
    },
    {
        "crop_name": "Pearl Millet (Bajra)",
        "scientific_name": "Pennisetum glaucum",
        "crop_image": "/plant-images/bajra.jpg",
        "soil_type": "Sandy Loam",
        "temperature_range": "25-35 C",
        "rainfall_requirement": "300-600 mm",
        "water_requirement": "250-450 mm per season",
        "growing_season": "Kharif",
        "growth_duration": "75-100 days",
        "seed_rate": "1.5-2 kg per acre",
        "fertilizer_recommendation": "Nitrogen top-dressing in two splits",
        "disease_risk": "Low",
        "market_demand": "Medium",
        "expected_yield": "2-3.5 tons per hectare",
        "planting_method": "Direct sowing",
        "irrigation_schedule": "Usually rainfed; one life irrigation if needed",
        "irrigation_method": "Sprinkler Irrigation",
        "common_diseases": ["Downy Mildew", "Ergot"],
        "disease_prevention": "Seed treatment and timely rouging.",
        "market_price_range": "INR 2100-3000 per quintal",
    },
    {
        "crop_name": "Green Gram (Moong)",
        "scientific_name": "Vigna radiata",
        "crop_image": "/plant-images/Green%20Gram.jpg",
        "soil_type": "Loamy Soil",
        "temperature_range": "25-35 C",
        "rainfall_requirement": "400-600 mm",
        "water_requirement": "250-400 mm per season",
        "growing_season": "Kharif / Summer",
        "growth_duration": "60-75 days",
        "seed_rate": "8-10 kg per acre",
        "fertilizer_recommendation": "Starter nitrogen with phosphorus",
        "disease_risk": "Low",
        "market_demand": "High",
        "expected_yield": "0.8-1.2 tons per hectare",
        "planting_method": "Line sowing",
        "irrigation_schedule": "Light irrigation at flowering and pod set",
        "irrigation_method": "Sprinkler Irrigation",
        "common_diseases": ["Yellow Mosaic", "Powdery Mildew"],
        "disease_prevention": "Control whitefly vectors and maintain clean fields.",
        "market_price_range": "INR 6500-9000 per quintal",
    },
    {
        "crop_name": "Black Gram (Urad)",
        "scientific_name": "Vigna mungo",
        "crop_image": "/plant-images/Black%20Gram.jpg",
        "soil_type": "Clay Loam",
        "temperature_range": "25-35 C",
        "rainfall_requirement": "450-650 mm",
        "water_requirement": "300-450 mm per season",
        "growing_season": "Kharif",
        "growth_duration": "80-100 days",
        "seed_rate": "8-10 kg per acre",
        "fertilizer_recommendation": "Phosphorus with biofertilizer inoculation",
        "disease_risk": "Low",
        "market_demand": "High",
        "expected_yield": "0.8-1.4 tons per hectare",
        "planting_method": "Direct line sowing",
        "irrigation_schedule": "Mostly rainfed with one supplemental irrigation",
        "irrigation_method": "Sprinkler Irrigation",
        "common_diseases": ["Leaf Crinkle", "Yellow Mosaic"],
        "disease_prevention": "Use tolerant varieties and vector control.",
        "market_price_range": "INR 6500-8800 per quintal",
    },
    {
        "crop_name": "Chili",
        "scientific_name": "Capsicum annuum",
        "crop_image": "/plant-images/Chili.jpg",
        "soil_type": "Well-drained Loam",
        "temperature_range": "20-30 C",
        "rainfall_requirement": "600-900 mm",
        "water_requirement": "600-900 mm per season",
        "growing_season": "Kharif / Rabi",
        "growth_duration": "120-180 days",
        "seed_rate": "80-100 g per acre",
        "fertilizer_recommendation": "NPK with calcium and micronutrient sprays",
        "disease_risk": "High",
        "market_demand": "High",
        "expected_yield": "2-3 tons dry pods per hectare",
        "planting_method": "Nursery transplanting",
        "irrigation_schedule": "Every 5-7 days with moisture consistency",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Anthracnose", "Leaf Curl", "Damping Off"],
        "disease_prevention": "Use healthy seedlings and integrated pest management.",
        "market_price_range": "INR 80-220 per kg (dry)",
    },
    {
        "crop_name": "Garlic",
        "scientific_name": "Allium sativum",
        "crop_image": "/plant-images/Garlic.jpg",
        "soil_type": "Sandy Loam",
        "temperature_range": "12-24 C",
        "rainfall_requirement": "500-700 mm",
        "water_requirement": "350-500 mm per season",
        "growing_season": "Rabi",
        "growth_duration": "120-150 days",
        "seed_rate": "180-220 kg cloves per acre",
        "fertilizer_recommendation": "NPK with sulfur and organic manure",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "6-9 tons per hectare",
        "planting_method": "Clove planting on raised beds",
        "irrigation_schedule": "Every 8-10 days depending on weather",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Purple Blotch", "Stemphylium Blight"],
        "disease_prevention": "Use disease-free cloves and proper spacing.",
        "market_price_range": "INR 30-120 per kg",
    },
    {
        "crop_name": "Ginger",
        "scientific_name": "Zingiber officinale",
        "crop_image": "/plant-images/Ginger.jpg",
        "soil_type": "Loamy Soil",
        "temperature_range": "20-30 C",
        "rainfall_requirement": "1000-1500 mm",
        "water_requirement": "900-1200 mm per season",
        "growing_season": "Kharif",
        "growth_duration": "210-240 days",
        "seed_rate": "600-800 kg rhizomes per acre",
        "fertilizer_recommendation": "Compost-rich soil with balanced NPK",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "15-25 tons per hectare",
        "planting_method": "Rhizome planting on raised beds",
        "irrigation_schedule": "At 7-10 day intervals in dry spells",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Rhizome Rot", "Leaf Spot"],
        "disease_prevention": "Seed treatment and good drainage.",
        "market_price_range": "INR 25-90 per kg",
    },
    {
        "crop_name": "Turmeric",
        "scientific_name": "Curcuma longa",
        "crop_image": "/plant-images/tumehric%20.jpg",
        "soil_type": "Loamy Soil",
        "temperature_range": "20-35 C",
        "rainfall_requirement": "1000-1500 mm",
        "water_requirement": "900-1300 mm per season",
        "growing_season": "Kharif",
        "growth_duration": "210-270 days",
        "seed_rate": "800-1000 kg rhizomes per acre",
        "fertilizer_recommendation": "High organic manure plus NPK",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "20-30 tons fresh rhizome per hectare",
        "planting_method": "Rhizome planting",
        "irrigation_schedule": "Every 7-10 days under low rainfall",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Leaf Blotch", "Rhizome Rot"],
        "disease_prevention": "Use clean seed rhizomes and raised beds.",
        "market_price_range": "INR 7000-11000 per quintal dry",
    },
    {
        "crop_name": "Banana",
        "scientific_name": "Musa paradisiaca",
        "crop_image": "/plant-images/Banana.jpg",
        "soil_type": "Rich Loam Soil",
        "temperature_range": "20-35 C",
        "rainfall_requirement": "1000-2000 mm",
        "water_requirement": "1200-2200 mm per season",
        "growing_season": "Year-round",
        "growth_duration": "300-360 days",
        "seed_rate": "1400-1700 tissue culture plants per acre",
        "fertilizer_recommendation": "High potassium and regular fertigation",
        "disease_risk": "High",
        "market_demand": "High",
        "expected_yield": "40-60 tons per hectare",
        "planting_method": "Sucker / tissue culture planting",
        "irrigation_schedule": "Frequent light irrigation every 2-3 days",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Panama Wilt", "Sigatoka"],
        "disease_prevention": "Use disease-free planting material and sanitize tools.",
        "market_price_range": "INR 8-22 per kg",
    },
    {
        "crop_name": "Papaya",
        "scientific_name": "Carica papaya",
        "crop_image": "/plant-images/Papaya.jpg",
        "soil_type": "Well-drained Loam",
        "temperature_range": "22-35 C",
        "rainfall_requirement": "900-1200 mm",
        "water_requirement": "800-1200 mm per season",
        "growing_season": "Year-round",
        "growth_duration": "240-300 days",
        "seed_rate": "80-120 g per acre",
        "fertilizer_recommendation": "Organic manure with NPK fertigation",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "35-50 tons per hectare",
        "planting_method": "Seedling transplanting",
        "irrigation_schedule": "Every 3-5 days with moisture monitoring",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Papaya Ring Spot Virus", "Anthracnose"],
        "disease_prevention": "Vector management and clean nursery stock.",
        "market_price_range": "INR 10-28 per kg",
    },
    {
        "crop_name": "Mango",
        "scientific_name": "Mangifera indica",
        "crop_image": "/plant-images/Mango.jpg",
        "soil_type": "Loamy Soil",
        "temperature_range": "24-30 C",
        "rainfall_requirement": "750-2500 mm",
        "water_requirement": "700-1200 mm annually",
        "growing_season": "Perennial",
        "growth_duration": "3-5 years to bearing",
        "seed_rate": "100-120 grafted plants per acre",
        "fertilizer_recommendation": "Organic manure plus annual NPK schedule",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "8-15 tons per hectare",
        "planting_method": "Grafted saplings",
        "irrigation_schedule": "Weekly in dry months; reduce near harvest",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Powdery Mildew", "Anthracnose"],
        "disease_prevention": "Canopy pruning and preventive fungicide sprays.",
        "market_price_range": "INR 25-120 per kg",
    },
    {
        "crop_name": "Guava",
        "scientific_name": "Psidium guajava",
        "crop_image": "/plant-images/Guava.jpg",
        "soil_type": "Sandy Loam",
        "temperature_range": "20-35 C",
        "rainfall_requirement": "900-1200 mm",
        "water_requirement": "700-1000 mm annually",
        "growing_season": "Perennial",
        "growth_duration": "2-3 years to bearing",
        "seed_rate": "150-180 grafted plants per acre",
        "fertilizer_recommendation": "Organic manure with NPK around root zone",
        "disease_risk": "Low",
        "market_demand": "High",
        "expected_yield": "15-25 tons per hectare",
        "planting_method": "Layered/grafted plants",
        "irrigation_schedule": "Every 7-12 days depending on season",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Wilt", "Anthracnose"],
        "disease_prevention": "Orchard sanitation and pruning.",
        "market_price_range": "INR 18-45 per kg",
    },
    {
        "crop_name": "Pomegranate",
        "scientific_name": "Punica granatum",
        "crop_image": "/plant-images/Pomegranate.jpg",
        "soil_type": "Black Cotton Soil",
        "temperature_range": "25-38 C",
        "rainfall_requirement": "500-800 mm",
        "water_requirement": "500-900 mm annually",
        "growing_season": "Perennial",
        "growth_duration": "2-3 years to bearing",
        "seed_rate": "160-220 plants per acre",
        "fertilizer_recommendation": "Balanced fertigation and micronutrient sprays",
        "disease_risk": "Moderate",
        "market_demand": "High",
        "expected_yield": "12-20 tons per hectare",
        "planting_method": "Grafted saplings",
        "irrigation_schedule": "Controlled irrigation as per bahar treatment",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Bacterial Blight", "Wilt"],
        "disease_prevention": "Sanitary pruning and copper sprays.",
        "market_price_range": "INR 60-180 per kg",
    },
    {
        "crop_name": "Grapes",
        "scientific_name": "Vitis vinifera",
        "crop_image": "/plant-images/Grapes.jpg",
        "soil_type": "Well-drained Black Soil",
        "temperature_range": "15-35 C",
        "rainfall_requirement": "600-900 mm",
        "water_requirement": "700-1100 mm annually",
        "growing_season": "Perennial",
        "growth_duration": "2-3 years to bearing",
        "seed_rate": "450-550 vines per acre",
        "fertilizer_recommendation": "Fertigation with potassium and calcium",
        "disease_risk": "High",
        "market_demand": "High",
        "expected_yield": "20-30 tons per hectare",
        "planting_method": "Rooted cuttings on trellis",
        "irrigation_schedule": "Frequent drip irrigation with ET-based scheduling",
        "irrigation_method": "Drip Irrigation",
        "common_diseases": ["Powdery Mildew", "Downy Mildew"],
        "disease_prevention": "Canopy management and preventive sprays.",
        "market_price_range": "INR 35-95 per kg",
    },
]

# Ensure the expanded list is available in advisory regardless of disease-model labels.
REQUIRED_CROPS = {
    "Tomato",
    "Onion",
    "Potato",
    "Soybean",
    "Cotton",
    "Sugarcane",
    "Wheat",
    "Rice",
    "Maize",
    "Chickpea",
    "Pigeon Pea (Tur)",
    "Groundnut",
    "Sunflower",
    "Mustard",
    "Sorghum (Jowar)",
    "Pearl Millet (Bajra)",
    "Green Gram (Moong)",
    "Black Gram (Urad)",
    "Chili",
    "Garlic",
    "Ginger",
    "Turmeric",
    "Banana",
    "Papaya",
    "Mango",
    "Guava",
    "Pomegranate",
    "Grapes",
}


_seed_lock = Lock()
_seed_completed = False


def _normalize_name(value: str) -> str:
    clean = value.lower().strip()
    clean = clean.replace("district", "")
    clean = clean.replace("division", "")
    clean = re.sub(r"[^a-z0-9]+", "", clean)
    return clean


def _build_district_aliases() -> Dict[str, str]:
    aliases = {}
    for district in MAHARASHTRA_DISTRICTS:
        aliases[_normalize_name(district)] = district

    aliases[_normalize_name("Mumbai")] = "Mumbai City"
    aliases[_normalize_name("Greater Mumbai")] = "Mumbai City"
    aliases[_normalize_name("Mumbai Suburban District")] = "Mumbai Suburban"
    aliases[_normalize_name("Dharashiv")] = "Osmanabad"
    return aliases


DISTRICT_ALIASES = _build_district_aliases()

LEVEL_SEQUENCE = ["Low", "Moderate", "High"]
LEVEL_NORMALIZATION = {
    "medium": "Moderate",
}
MOISTURE_SEQUENCE = ["Low", "Moderate", "High"]
DRAINAGE_SEQUENCE = ["Low", "Moderate", "Good", "High"]


def resolve_district_name(value: str) -> Optional[str]:
    normalized = DISTRICT_ALIASES.get(_normalize_name(value))
    return normalized


def _district_seed_number(district: str) -> int:
    return sum(ord(char) for char in district.lower())


def _canonical_level(value: str) -> str:
    normalized = value.strip().lower()
    return LEVEL_NORMALIZATION.get(normalized, value.title())


def _vary_sequence_value(base: str, sequence: List[str], seed: int, offset: int = 0) -> str:
    canonical = _canonical_level(base)
    if canonical not in sequence:
        return canonical

    base_index = sequence.index(canonical)
    # Shift one step backward/forward based on district seed for stable but distinct values.
    shift = ((seed + offset) % 3) - 1
    return sequence[(base_index + shift) % len(sequence)]


def _vary_ph_range(ph_range: str, seed: int) -> str:
    values = [float(match) for match in re.findall(r"\d+(?:\.\d+)?", ph_range)]
    if len(values) < 2:
        return ph_range

    low, high = values[0], values[-1]
    span = max(high - low, 0.2)
    delta = ((seed % 5) - 2) * 0.08
    adjusted_low = min(max(low + delta, 4.8), 8.5)
    adjusted_high = min(max(adjusted_low + span, adjusted_low + 0.2), 9.0)
    return f"{adjusted_low:.1f} - {adjusted_high:.1f}"


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def nearest_district(latitude: float, longitude: float) -> str:
    return min(
        DISTRICT_CENTROIDS.keys(),
        key=lambda district: _haversine_km(latitude, longitude, DISTRICT_CENTROIDS[district][0], DISTRICT_CENTROIDS[district][1]),
    )


async def reverse_geocode_district(latitude: float, longitude: float) -> Optional[str]:
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "lat": latitude,
        "lon": longitude,
        "format": "jsonv2",
        "addressdetails": 1,
        "zoom": 10,
    }
    headers = {
        "User-Agent": "ShetVaidya-AreaIntelligence/1.0",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params=params, headers=headers)
        if resp.status_code != 200:
            return None

        payload = resp.json()
        address = payload.get("address", {})
        for key in ["state_district", "county", "city_district", "district", "city", "municipality", "suburb"]:
            value = address.get(key)
            if not value:
                continue
            match = resolve_district_name(value)
            if match:
                return match
    except (httpx.HTTPError, ValueError):
        return None

    return None


def _soil_profile_for_district(district: str) -> Dict[str, str]:
    profile_key = DISTRICT_TO_PROFILE.get(district, "alluvial_loam")
    return SOIL_PROFILES[profile_key]


def _district_soil_profile(district: str) -> Dict[str, str]:
    seed = _district_seed_number(district)
    profile = dict(_soil_profile_for_district(district))

    profile["ph_level"] = _vary_ph_range(profile["ph_level"], seed)
    profile["nitrogen_level"] = _vary_sequence_value(profile["nitrogen_level"], LEVEL_SEQUENCE, seed, offset=1)
    profile["phosphorus_level"] = _vary_sequence_value(profile["phosphorus_level"], LEVEL_SEQUENCE, seed, offset=2)
    profile["potassium_level"] = _vary_sequence_value(profile["potassium_level"], LEVEL_SEQUENCE, seed, offset=3)
    profile["organic_matter"] = _vary_sequence_value(profile["organic_matter"], LEVEL_SEQUENCE, seed, offset=4)
    profile["moisture_retention"] = _vary_sequence_value(profile["moisture_retention"], MOISTURE_SEQUENCE, seed, offset=5)
    profile["drainage_capacity"] = _vary_sequence_value(profile["drainage_capacity"], DRAINAGE_SEQUENCE, seed, offset=6)

    return profile


def _soil_improvement_recommendations(soil_report: SoilReport) -> List[str]:
    recommendations: List[str] = []

    if "low" in soil_report.nitrogen_level.lower():
        recommendations.append("Low Nitrogen -> Apply Urea or Ammonium Sulfate in split doses.")
    if "low" in soil_report.phosphorus_level.lower():
        recommendations.append("Low Phosphorus -> Apply Single Super Phosphate (SSP) during basal application.")
    if "low" in soil_report.potassium_level.lower():
        recommendations.append("Low Potassium -> Apply Muriate of Potash (MOP) as per soil test.")
    if "low" in soil_report.organic_matter.lower():
        recommendations.append("Low Organic Matter -> Add compost or farm yard manure before sowing.")

    ph_values = [float(match) for match in re.findall(r"\d+(?:\.\d+)?", soil_report.ph_level)]
    if ph_values:
        ph_low = ph_values[0]
        ph_high = ph_values[-1]
        if ph_high < 6.2:
            recommendations.append("High Soil Acidity -> Apply agricultural lime and monitor pH every season.")
        if ph_low > 7.8:
            recommendations.append("High Soil Alkalinity -> Apply gypsum and improve organic content.")

    if not recommendations:
        recommendations.append("Maintain balanced fertilization using NPK and organic manure according to crop stage.")

    return recommendations


def _catalog_index() -> Dict[str, Dict[str, Any]]:
    return {entry["crop_name"]: entry for entry in CROP_CATALOG}


CROP_INDEX = _catalog_index()


def _priority_crops_for_soil(soil_type: str) -> List[str]:
    picks = SOIL_PRIORITY_CROPS.get(soil_type)
    if not picks:
        return [
            "Tomato",
            "Onion",
            "Soybean",
            "Cotton",
            "Wheat",
            "Rice",
            "Maize",
            "Chickpea",
            "Pomegranate",
            "Grapes",
            "Banana",
            "Turmeric",
        ]

    normalized = [crop for crop in picks if crop in CROP_INDEX]
    return normalized


def ensure_area_intelligence_seed(db: Session) -> None:
    global _seed_completed
    if _seed_completed:
        return

    with _seed_lock:
        if _seed_completed:
            return

        existing_reports = {
            report.district: report
            for report in db.query(SoilReport).filter(SoilReport.state == MAHARASHTRA_STATE).all()
        }
        for district in MAHARASHTRA_DISTRICTS:
            profile = _district_soil_profile(district)
            existing_report = existing_reports.get(district)
            if not existing_report:
                db.add(
                    SoilReport(
                        state=MAHARASHTRA_STATE,
                        district=district,
                        soil_type=profile["soil_type"],
                        ph_level=profile["ph_level"],
                        nitrogen_level=profile["nitrogen_level"],
                        phosphorus_level=profile["phosphorus_level"],
                        potassium_level=profile["potassium_level"],
                        organic_matter=profile["organic_matter"],
                        moisture_retention=profile["moisture_retention"],
                        drainage_capacity=profile["drainage_capacity"],
                    )
                )
                continue

            existing_report.soil_type = profile["soil_type"]
            existing_report.ph_level = profile["ph_level"]
            existing_report.nitrogen_level = profile["nitrogen_level"]
            existing_report.phosphorus_level = profile["phosphorus_level"]
            existing_report.potassium_level = profile["potassium_level"]
            existing_report.organic_matter = profile["organic_matter"]
            existing_report.moisture_retention = profile["moisture_retention"]
            existing_report.drainage_capacity = profile["drainage_capacity"]
            db.add(existing_report)

        existing_crops = {value[0] for value in db.query(CropRecommendation.crop_name).all()}
        for crop in CROP_CATALOG:
            if crop["crop_name"] in existing_crops:
                continue
            db.add(
                CropRecommendation(
                    crop_name=crop["crop_name"],
                    soil_type=crop["soil_type"],
                    temperature_range=crop["temperature_range"],
                    rainfall_requirement=crop["rainfall_requirement"],
                    water_requirement=crop["water_requirement"],
                    growing_season=crop["growing_season"],
                    growth_duration=crop["growth_duration"],
                    seed_rate=crop["seed_rate"],
                    fertilizer_recommendation=crop["fertilizer_recommendation"],
                    disease_risk=crop["disease_risk"],
                    market_demand=crop["market_demand"],
                )
            )

        db.commit()
        _seed_completed = True


def get_supported_districts() -> List[str]:
    return MAHARASHTRA_DISTRICTS


def _build_crop_payload(crop_row: CropRecommendation) -> Dict[str, Any]:
    base = CROP_INDEX.get(crop_row.crop_name, {})
    return {
        "crop_name": crop_row.crop_name,
        "scientific_name": base.get("scientific_name", crop_row.crop_name),
        "crop_image": base.get("crop_image", "https://picsum.photos/seed/shetvaidya-crop/420/260"),
        "growing_season": crop_row.growing_season,
        "water_requirement": crop_row.water_requirement,
        "expected_yield": base.get("expected_yield", "Varies by management practices"),
        "suitable_soil_type": crop_row.soil_type,
        "ideal_temperature_range": crop_row.temperature_range,
        "rainfall_requirement": crop_row.rainfall_requirement,
        "seed_rate_per_acre": crop_row.seed_rate,
        "average_growth_duration": crop_row.growth_duration,
        "fertilizer_recommendation": crop_row.fertilizer_recommendation,
        "pest_disease_risk_level": crop_row.disease_risk,
        "market_demand_indicator": crop_row.market_demand,
        "planting_method": base.get("planting_method", "Line sowing"),
        "irrigation_schedule": base.get("irrigation_schedule", "Adjust frequency based on soil moisture"),
        "irrigation_method": base.get("irrigation_method", "Drip Irrigation"),
        "common_diseases": base.get("common_diseases", []),
        "disease_prevention": base.get("disease_prevention", "Follow integrated crop and pest management."),
        "market_price_range": base.get("market_price_range", "Varies by mandi and season"),
    }


def _build_water_guidance(crops: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    return [
        {
            "crop_name": crop["crop_name"],
            "water_requirement": crop["water_requirement"],
            "recommended_method": crop["irrigation_method"],
        }
        for crop in crops
    ]


def get_area_intelligence_payload(db: Session, district: str) -> Dict[str, Any]:
    ensure_area_intelligence_seed(db)

    resolved = resolve_district_name(district)
    if not resolved:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown district")

    soil_report = db.query(SoilReport).filter(SoilReport.state == MAHARASHTRA_STATE, SoilReport.district == resolved).first()
    if not soil_report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Soil report unavailable")

    crops = db.query(CropRecommendation).all()
    crop_by_name = {crop.crop_name: crop for crop in crops}

    missing_from_catalog = REQUIRED_CROPS.difference(crop_by_name.keys())
    if missing_from_catalog:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Crop catalog initialization incomplete",
        )

    priority_names = _priority_crops_for_soil(soil_report.soil_type)
    ordered_names: List[str] = []
    for name in priority_names:
        if name in crop_by_name and name not in ordered_names:
            ordered_names.append(name)

    remaining = sorted(
        [name for name in crop_by_name.keys() if name not in ordered_names],
        key=lambda crop_name: (crop_by_name[crop_name].market_demand != "High", crop_name),
    )
    ordered_names.extend(remaining)

    if ordered_names:
        offset = _district_seed_number(resolved) % len(ordered_names)
        ordered_names = ordered_names[offset:] + ordered_names[:offset]

    selected_names = ordered_names[:12]
    selected_crops = [_build_crop_payload(crop_by_name[name]) for name in selected_names]

    return {
        "state": MAHARASHTRA_STATE,
        "district": resolved,
        "soil_report": {
            "state": soil_report.state,
            "district": soil_report.district,
            "soil_type": soil_report.soil_type,
            "ph_level": soil_report.ph_level,
            "nitrogen_level": soil_report.nitrogen_level,
            "phosphorus_level": soil_report.phosphorus_level,
            "potassium_level": soil_report.potassium_level,
            "organic_matter": soil_report.organic_matter,
            "moisture_retention": soil_report.moisture_retention,
            "drainage_capacity": soil_report.drainage_capacity,
        },
        "soil_improvement_recommendations": _soil_improvement_recommendations(soil_report),
        "recommended_crops": selected_crops,
        "water_guidance": _build_water_guidance(selected_crops),
        "generated_at": datetime.utcnow(),
    }
