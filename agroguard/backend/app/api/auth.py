from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.api import deps
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    GoogleAuthRequest,
    SimpleStatusResponse,
    UpdateProfileRequest,
    UpdateLocationRequest,
    UserOut,
)
from app.utils.rate_limiter import enforce_rate_limit
from app.utils.security import create_jwt

router = APIRouter()


def _set_auth_cookie(response: Response, token: str) -> None:
    same_site = "none" if settings.cookie_secure else "lax"
    response.set_cookie(
        key=settings.jwt_cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=same_site,
        max_age=settings.jwt_exp_minutes * 60,
    )


@router.post("/google", response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest, request: Request, response: Response, db: Session = Depends(deps.get_db)):
    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured")

    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"google_login:{client_ip}"
    enforce_rate_limit(rate_key, settings.otp_request_limit, settings.otp_request_window_seconds)

    try:
        token_info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google credential") from exc

    issuer = token_info.get("iss")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google issuer")

    if not token_info.get("email_verified"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google email is not verified")

    email = str(token_info.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google account email is missing")

    google_sub = str(token_info.get("sub", "")).strip()
    full_name = str(token_info.get("name", "")).strip() or None
    picture_url = str(token_info.get("picture", "")).strip() or None

    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user and google_sub:
        user = db.query(User).filter(User.google_sub == google_sub).first()

    if not user:
        user = User(
            email=email,
            full_name=full_name,
            picture_url=picture_url,
            google_sub=google_sub or None,
            auth_provider="google",
        )
    else:
        user.email = email
        user.auth_provider = "google"
        if google_sub:
            user.google_sub = google_sub
        if full_name:
            user.full_name = full_name
        if picture_url:
            user.picture_url = picture_url

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_jwt({"sub": str(user.id)})
    _set_auth_cookie(response, token)
    return {"user": user, "access_token": token}


@router.post("/logout", response_model=SimpleStatusResponse)
def logout(response: Response):
    same_site = "none" if settings.cookie_secure else "lax"
    response.delete_cookie(
        key=settings.jwt_cookie_name,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=same_site,
    )
    return {"status": "logged_out"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(deps.get_current_user)):
    return current_user


@router.post("/profile", response_model=UserOut)
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    current_user.full_name = payload.full_name.strip()
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/location", response_model=UserOut)
def update_location(
    payload: UpdateLocationRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    current_user.latitude = payload.latitude
    current_user.longitude = payload.longitude
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
