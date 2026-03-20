from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional


class RegisterRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)
    latitude: float
    longitude: float


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginVerifyRequest(LoginRequest):
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ChangeEmailRequest(BaseModel):
    email: EmailStr


class ChangeEmailVerifyRequest(ChangeEmailRequest):
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class UpdateLocationRequest(BaseModel):
    latitude: float
    longitude: float


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8)
    new_password: str = Field(min_length=8)


class UserOut(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: EmailStr
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    user: UserOut


class SimpleStatusResponse(BaseModel):
    status: str
