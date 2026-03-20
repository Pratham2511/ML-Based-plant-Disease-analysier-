import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String, UniqueConstraint, Uuid

from app.db.base_class import Base


class SoilReport(Base):
    __tablename__ = "soil_reports"
    __table_args__ = (
        UniqueConstraint("state", "district", name="uq_soil_reports_state_district"),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    state = Column(String, nullable=False, index=True)
    district = Column(String, nullable=False, index=True)
    soil_type = Column(String, nullable=False)
    ph_level = Column(String, nullable=False)
    nitrogen_level = Column(String, nullable=False)
    phosphorus_level = Column(String, nullable=False)
    potassium_level = Column(String, nullable=False)
    organic_matter = Column(String, nullable=False)
    moisture_retention = Column(String, nullable=False)
    drainage_capacity = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
