from pydantic import BaseModel, EmailStr, Field
from typing import Optional


PASSWORD_REGEX = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$"


class RegisterRequest(BaseModel):
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


class UserOut(BaseModel):
    id: str
    email: EmailStr
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        orm_mode = True


class AuthResponse(BaseModel):
    user: UserOut


class SimpleStatusResponse(BaseModel):
    status: str
