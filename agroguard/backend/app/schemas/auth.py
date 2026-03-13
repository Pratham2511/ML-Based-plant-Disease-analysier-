from pydantic import BaseModel, EmailStr, Field
from typing import Optional


PASSWORD_REGEX = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$"


class RegisterRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, regex=PASSWORD_REGEX)
    latitude: float
    longitude: float


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, regex=PASSWORD_REGEX)


class LoginVerifyRequest(LoginRequest):
    otp: str = Field(min_length=6, max_length=6, regex=r"^\d{6}$")


class ChangeEmailRequest(BaseModel):
    email: EmailStr


class ChangeEmailVerifyRequest(ChangeEmailRequest):
    otp: str = Field(min_length=6, max_length=6, regex=r"^\d{6}$")


class UpdateLocationRequest(BaseModel):
    latitude: float
    longitude: float


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8)
    new_password: str = Field(min_length=8, regex=PASSWORD_REGEX)


class UserOut(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: EmailStr
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        orm_mode = True


class AuthResponse(BaseModel):
    user: UserOut


class SimpleStatusResponse(BaseModel):
    status: str
