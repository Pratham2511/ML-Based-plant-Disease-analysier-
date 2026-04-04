import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base_class import Base


class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    disease_name = Column(String(200), nullable=True)
    confidence = Column(Float, nullable=True)
    image_url = Column(String(500), nullable=True)
    analysis_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default="now()")

    farm_id = Column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="SET NULL"), nullable=True)
    crop_type = Column(String(100), nullable=True)
    top_predictions = Column(JSONB, nullable=True)
