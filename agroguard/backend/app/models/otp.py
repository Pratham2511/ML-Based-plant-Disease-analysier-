import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, String, Uuid
from app.db.base_class import Base


class OTPVerification(Base):
    __tablename__ = "otp_verification"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    otp_hash = Column(String, nullable=False)
    purpose = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
