import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base


class Disease(Base):
    __tablename__ = "diseases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    crop_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    cause = Column(String, nullable=False)
    treatment = Column(String, nullable=False)
    recommended_medicines = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
