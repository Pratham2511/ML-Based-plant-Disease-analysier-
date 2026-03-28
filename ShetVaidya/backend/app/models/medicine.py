import uuid
from datetime import datetime
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, Uuid, func
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

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_name = Column(String, nullable=False)
    company = Column(String, nullable=False)
    active_ingredient = Column(String, nullable=False)
    concentration = Column(String, nullable=False)
    crop_type = Column(String, nullable=False)
    disease_category = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    batches = relationship("MedicineBatch", back_populates="medicine")
    bottle_codes = relationship("BottleCode", back_populates="medicine")


class MedicineBatch(Base):
    __tablename__ = "medicine_batches"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medicine_id = Column(Uuid(as_uuid=True), ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)
    batch_code = Column(String, unique=True, index=True, nullable=False)
    batch_size = Column(Integer, default=50, nullable=False)
    manufacture_date = Column(Date, nullable=False)
    is_valid = Column(Boolean, default=True, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    used_by_district = Column(String(100), nullable=True)
    scan_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    medicine = relationship("Medicine", back_populates="batches")
    bottle_codes = relationship("BottleCode", back_populates="batch")


class BottleCode(Base):
    __tablename__ = "bottle_codes"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medicine_id = Column(Uuid(as_uuid=True), ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Uuid(as_uuid=True), ForeignKey("medicine_batches.id", ondelete="CASCADE"), nullable=False)
    bottle_number = Column(Integer, nullable=False)
    unique_code = Column(String(50), unique=True, nullable=False, index=True)
    is_used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    used_by_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True)
    used_by_district = Column(String(100), nullable=True)
    scan_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    medicine = relationship("Medicine", back_populates="bottle_codes")
    batch = relationship("MedicineBatch", back_populates="bottle_codes")
