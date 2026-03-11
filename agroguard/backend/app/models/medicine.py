import uuid
from datetime import datetime
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class Medicine(Base):
    __tablename__ = "medicines"
    __table_args__ = (
        UniqueConstraint(
            "brand_name",
            "company",
            "active_ingredient",
            "concentration",
            "crop_type",
            "disease_category",
            name="uq_medicine_normalized",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_name = Column(String, nullable=False)
    company = Column(String, nullable=False)
    active_ingredient = Column(String, nullable=False)
    concentration = Column(String, nullable=False)
    crop_type = Column(String, nullable=False)
    disease_category = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    batches = relationship("MedicineBatch", back_populates="medicine")


class MedicineBatch(Base):
    __tablename__ = "medicine_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medicine_id = Column(UUID(as_uuid=True), ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)
    batch_code = Column(String, unique=True, index=True, nullable=False)
    batch_size = Column(Integer, default=100, nullable=False)
    manufacture_date = Column(Date, nullable=False)
    is_valid = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    medicine = relationship("Medicine", back_populates="batches")
