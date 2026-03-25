import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, String, Uuid

from app.db.base_class import Base


class Farm(Base):
    __tablename__ = "farms"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    crop = Column(String(100), nullable=False)
    area_acres = Column(Float, nullable=True)
    district = Column(String(100), nullable=True)
    soil_type = Column(String(100), nullable=True)
    irrigation_type = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
