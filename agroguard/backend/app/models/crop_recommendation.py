import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base


class CropRecommendation(Base):
    __tablename__ = "crop_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    crop_name = Column(String, nullable=False, unique=True, index=True)
    soil_type = Column(String, nullable=False)
    temperature_range = Column(String, nullable=False)
    rainfall_requirement = Column(String, nullable=False)
    water_requirement = Column(String, nullable=False)
    growing_season = Column(String, nullable=False)
    growth_duration = Column(String, nullable=False)
    seed_rate = Column(String, nullable=False)
    fertilizer_recommendation = Column(String, nullable=False)
    disease_risk = Column(String, nullable=False)
    market_demand = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
