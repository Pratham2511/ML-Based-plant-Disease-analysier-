export type SoilReport = {
  state: string;
  district: string;
  soil_type: string;
  ph_level: string;
  nitrogen_level: string;
  phosphorus_level: string;
  potassium_level: string;
  organic_matter: string;
  moisture_retention: string;
  drainage_capacity: string;
};

export type CropRecommendation = {
  crop_name: string;
  scientific_name: string;
  crop_image: string;
  growing_season: string;
  water_requirement: string;
  expected_yield: string;
  suitable_soil_type: string;
  ideal_temperature_range: string;
  rainfall_requirement: string;
  seed_rate_per_acre: string;
  average_growth_duration: string;
  fertilizer_recommendation: string;
  pest_disease_risk_level: string;
  market_demand_indicator: string;
  planting_method: string;
  irrigation_schedule: string;
  irrigation_method: string;
  common_diseases: string[];
  disease_prevention: string;
  market_price_range: string;
};

export type WaterGuidance = {
  crop_name: string;
  water_requirement: string;
  recommended_method: string;
};

export type AreaIntelligenceResponse = {
  state: string;
  district: string;
  soil_report: SoilReport;
  soil_improvement_recommendations: string[];
  recommended_crops: CropRecommendation[];
  water_guidance: WaterGuidance[];
  generated_at: string;
};

export type DetectDistrictResponse = {
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  source: string;
};
