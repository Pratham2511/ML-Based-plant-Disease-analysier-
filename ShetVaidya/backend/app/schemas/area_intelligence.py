from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class DetectDistrictRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class DetectDistrictResponse(BaseModel):
    state: str
    district: str
    latitude: float
    longitude: float
    source: str


class DistrictListResponse(BaseModel):
    state: str
    districts: List[str]


class SoilReportOut(BaseModel):
    state: str
    district: str
    soil_type: str
    ph_level: str
    nitrogen_level: str
    phosphorus_level: str
    potassium_level: str
    organic_matter: str
    moisture_retention: str
    drainage_capacity: str


class CropRecommendationOut(BaseModel):
    crop_name: str
    scientific_name: str
    crop_image: str
    growing_season: str
    water_requirement: str
    expected_yield: str
    suitable_soil_type: str
    ideal_temperature_range: str
    rainfall_requirement: str
    seed_rate_per_acre: str
    average_growth_duration: str
    fertilizer_recommendation: str
    pest_disease_risk_level: str
    market_demand_indicator: str
    planting_method: str
    irrigation_schedule: str
    irrigation_method: str
    common_diseases: List[str]
    disease_prevention: str
    market_price_range: str


class WaterRequirementOut(BaseModel):
    crop_name: str
    water_requirement: str
    recommended_method: str


class AreaIntelligenceResponse(BaseModel):
    state: str
    district: str
    soil_report: SoilReportOut
    soil_improvement_recommendations: List[str]
    recommended_crops: List[CropRecommendationOut]
    water_guidance: List[WaterRequirementOut]
    generated_at: datetime
