from typing import Generator
from pydantic import BaseModel
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.config import settings
from app.utils.security import verify_token


class TokenUser(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    picture_url: str | None = None
    latitude: float | None = None
    longitude: float | None = None


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(request: Request) -> TokenUser:
    token = request.cookies.get(settings.jwt_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        payload = verify_token(token)
        email = str(payload.get("email", "")).strip()
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return TokenUser(
            id=str(payload.get("sub")),
            email=email,
            full_name=payload.get("full_name"),
            picture_url=payload.get("picture_url"),
            latitude=payload.get("latitude"),
            longitude=payload.get("longitude"),
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_optional_current_user(request: Request) -> TokenUser | None:
    token = request.cookies.get(settings.jwt_cookie_name)
    if not token:
        return None

    try:
        payload = verify_token(token)
        email = str(payload.get("email", "")).strip()
        if not email:
            return None
        return TokenUser(
            id=str(payload.get("sub")),
            email=email,
            full_name=payload.get("full_name"),
            picture_url=payload.get("picture_url"),
            latitude=payload.get("latitude"),
            longitude=payload.get("longitude"),
        )
    except Exception:
        return None
