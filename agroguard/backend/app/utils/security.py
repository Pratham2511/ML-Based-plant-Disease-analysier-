from datetime import datetime, timedelta

import bcrypt
import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    if not password or not hashed:
        return False
    return bcrypt.checkpw(password.encode(), hashed.encode())


def hash_otp(otp: str) -> str:
    return bcrypt.hashpw(otp.encode(), bcrypt.gensalt()).decode()


def verify_otp(otp: str, hashed: str) -> bool:
    if not otp or not hashed:
        return False
    return bcrypt.checkpw(otp.encode(), hashed.encode())


def create_jwt(payload: dict) -> str:
    to_encode = payload.copy()
    now = datetime.utcnow()
    to_encode["iat"] = now
    to_encode["exp"] = now + timedelta(minutes=settings.jwt_exp_minutes)
    to_encode.setdefault("typ", "access")
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
