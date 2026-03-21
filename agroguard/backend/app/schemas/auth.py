from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from uuid import UUID


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = Field(default=None, min_length=20)
    access_token: Optional[str] = Field(default=None, min_length=20)


class UpdateLocationRequest(BaseModel):
    latitude: float
    longitude: float


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)


class UserOut(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    email: EmailStr
    picture_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str


class SimpleStatusResponse(BaseModel):
    status: str
