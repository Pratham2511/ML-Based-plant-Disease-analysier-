from typing import Generator
import logging
from pydantic import BaseModel
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.config import settings
from app.utils.security import verify_token

logger = logging.getLogger(__name__)


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
        logger.warning("Missing auth token cookie on request path=%s", request.url.path)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        payload = verify_token(token)
        email = str(payload.get("email", "")).strip()
        if not email:
            logger.warning("Invalid token payload without email")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        token_user = TokenUser(
            id=str(payload.get("sub")),
            email=email,
            full_name=payload.get("full_name"),
            picture_url=payload.get("picture_url"),
            latitude=payload.get("latitude"),
            longitude=payload.get("longitude"),
        )
        logger.info("Authenticated user: id=%s email=%s", token_user.id, token_user.email)
        return token_user
    except Exception:
        logger.exception("Token verification failed")
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
