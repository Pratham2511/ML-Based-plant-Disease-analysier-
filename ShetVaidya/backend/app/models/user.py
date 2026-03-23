import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, String, Uuid
from app.db.base_class import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    picture_url = Column(String, nullable=True)
    google_sub = Column(String, unique=True, index=True, nullable=True)
    auth_provider = Column(String, nullable=False, default="google")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
