from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
import httpx
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.api import deps
from app.core.config import settings
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


def _resolve_cookie_options(request: Request) -> tuple[bool, str]:
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    proxy_https = forwarded_proto.split(",")[0].strip().lower() == "https"
    is_https_request = request.url.scheme == "https" or proxy_https

    secure_cookie = bool(settings.cookie_secure or is_https_request)
    same_site = "none" if secure_cookie else "lax"
    return secure_cookie, same_site


def _set_auth_cookie(response: Response, token: str, request: Request) -> None:
    secure_cookie, same_site = _resolve_cookie_options(request)
    response.set_cookie(
        key=settings.jwt_cookie_name,
        value=token,
        httponly=True,
        secure=secure_cookie,
        samesite=same_site,
        max_age=settings.jwt_exp_minutes * 60,
    )


def _claims_to_user(payload: dict) -> UserOut:
    return UserOut(
        id=str(payload.get("sub")),
        email=str(payload.get("email", "")).strip().lower(),
        full_name=payload.get("full_name"),
        picture_url=payload.get("picture_url"),
        latitude=payload.get("latitude"),
        longitude=payload.get("longitude"),
    )


@router.post("/google", response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest, request: Request, response: Response):
    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured")

    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"google_login:{client_ip}"
    enforce_rate_limit(rate_key, settings.auth_request_limit, settings.auth_request_window_seconds)

    token_info = None
    if payload.credential:
        try:
            token_info = id_token.verify_oauth2_token(
                payload.credential,
                google_requests.Request(),
                settings.google_client_id,
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google credential") from exc
    elif payload.access_token:
        try:
            token_info_resp = httpx.get(
                "https://www.googleapis.com/oauth2/v3/tokeninfo",
                params={"access_token": payload.access_token},
                timeout=10.0,
            )
            token_info_resp.raise_for_status()
            token_info = token_info_resp.json()
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google access token") from exc
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="credential or access_token is required")

    issuer = token_info.get("iss")
    if issuer and issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google issuer")

    if not token_info.get("email_verified"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google email is not verified")

    email = str(token_info.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google account email is missing")

    google_sub = str(token_info.get("sub", "")).strip()
    full_name = str(token_info.get("name", "")).strip() or None
    picture_url = str(token_info.get("picture", "")).strip() or None

    subject = google_sub or email
    token_payload = {
        "sub": subject,
        "email": email,
        "full_name": full_name,
        "picture_url": picture_url,
        "auth_provider": "google",
    }
    token = create_jwt(token_payload)
    _set_auth_cookie(response, token, request)
    return {"user": _claims_to_user(token_payload), "access_token": token}


@router.post("/logout", response_model=SimpleStatusResponse)
def logout(request: Request, response: Response):
    secure_cookie, same_site = _resolve_cookie_options(request)
    response.delete_cookie(
        key=settings.jwt_cookie_name,
        httponly=True,
        secure=secure_cookie,
        samesite=same_site,
    )
    return {"status": "logged_out"}


@router.get("/me", response_model=UserOut)
def me(current_user: deps.TokenUser = Depends(deps.get_current_user)):
    return current_user


@router.post("/profile", response_model=UserOut)
def update_profile(
    payload: UpdateProfileRequest,
    request: Request,
    response: Response,
    current_user: deps.TokenUser = Depends(deps.get_current_user),
):
    token_payload = {
        "sub": current_user.id,
        "email": current_user.email,
        "full_name": payload.full_name.strip(),
        "picture_url": current_user.picture_url,
        "latitude": current_user.latitude,
        "longitude": current_user.longitude,
        "auth_provider": "google",
    }
    token = create_jwt(token_payload)
    _set_auth_cookie(response, token, request)
    return _claims_to_user(token_payload)


@router.post("/location", response_model=UserOut)
def update_location(
    payload: UpdateLocationRequest,
    request: Request,
    response: Response,
    current_user: deps.TokenUser = Depends(deps.get_current_user),
):
    token_payload = {
        "sub": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "picture_url": current_user.picture_url,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "auth_provider": "google",
    }
    token = create_jwt(token_payload)
    _set_auth_cookie(response, token, request)
    return _claims_to_user(token_payload)
