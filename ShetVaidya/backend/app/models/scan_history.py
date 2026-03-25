import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, String, Text, Uuid
from app.db.base_class import Base


class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, index=True, nullable=False)
    farm_id = Column(Uuid(as_uuid=True), nullable=True)
    disease_name = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    image_url = Column(String, nullable=False)
    analysis_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
