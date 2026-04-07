from datetime import datetime, timedelta
import json
import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse
import httpx
import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import text
from sqlalchemy.orm import Session

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

router = APIRouter()
logger = logging.getLogger(__name__)

MOBILE_AUTH_CALLBACK_HTML = """<!doctype html>
<html lang=\"en\">
    <head>
        <meta charset=\"UTF-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
        <title>ShetVaidya Mobile Auth</title>
    </head>
    <body>
        <p>Completing secure sign-in...</p>
        <script>
            (function () {
                const hashParams = new URLSearchParams(window.location.hash.slice(1));
                const queryParams = new URLSearchParams(window.location.search);
                const credential = hashParams.get('id_token') || hashParams.get('credential') || queryParams.get('id_token');

                if (!credential) {
                    document.body.innerHTML = '<p>Google sign-in failed: missing token.</p>';
                    return;
                }

                const deepLink = `shetvaidya://login-callback#credential=${encodeURIComponent(credential)}`;
                window.location.replace(deepLink);
            })();
        </script>
    </body>
</html>
"""

ADMIN_EMAILS = {
    email.strip().lower()
    for email in os.getenv("ADMIN_EMAILS", "").split(",")
    if email.strip()
}


def create_access_token(user_email: str, user_id: str, extra_claims: dict | None = None) -> str:
    normalized_email = user_email.strip().lower()
    role = "admin" if normalized_email in ADMIN_EMAILS else "user"
    payload = {
        "sub": user_id,
        "email": normalized_email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=settings.jwt_exp_minutes),
        "typ": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _get_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    forwarded_ip = forwarded_for.split(",")[0].strip() if forwarded_for else ""
    if forwarded_ip:
        return forwarded_ip
    if request.client and request.client.host:
        return request.client.host
    return None


def log_activity(
    db: Session,
    user_id: str,
    action_type: str,
    details: dict | None = None,
    ip: str | None = None,
) -> None:
    try:
        db.execute(
            text(
                """
                INSERT INTO activity_log (user_id, action_type, details, ip_address, created_at)
                VALUES (:uid, :action, :details, :ip, NOW())
                """
            ),
            {
                "uid": user_id,
                "action": action_type,
                "details": json.dumps(details or {}),
                "ip": ip,
            },
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("Activity log failed: %s", exc)


def _resolve_cookie_options(request: Request) -> tuple[bool, str]:
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    proxy_https = forwarded_proto.split(",")[0].strip().lower() == "https"
    is_https_request = request.url.scheme == "https" or proxy_https
    host = request.headers.get("host", "").split(":")[0].strip().lower()
    is_local_host = host in {"localhost", "127.0.0.1", "::1"}

    secure_cookie = bool(settings.cookie_secure or is_https_request or (host and not is_local_host))
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
        role=str(payload.get("role") or "user"),
    )


@router.post("/google", response_model=AuthResponse)
def google_auth(
    payload: GoogleAuthRequest,
    request: Request,
    response: Response,
    db: Session = Depends(deps.get_db),
):
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

    email_verified_raw = token_info.get("email_verified")
    email_verified = email_verified_raw if isinstance(email_verified_raw, bool) else str(email_verified_raw).lower() in {"true", "1"}
    if not email_verified:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google email is not verified")

    email = str(token_info.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google account email is missing")

    google_sub = str(token_info.get("sub", "")).strip()
    full_name = str(token_info.get("name", "")).strip() or None
    picture_url = str(token_info.get("picture", "")).strip() or None

    subject = google_sub or email
    token_payload = {
        "full_name": full_name,
        "picture_url": picture_url,
        "auth_provider": "google",
    }
    token = create_access_token(email, subject, token_payload)
    user_claims = {
        "sub": subject,
        "email": email,
        "role": "admin" if email in ADMIN_EMAILS else "user",
        **token_payload,
    }
    _set_auth_cookie(response, token, request)
    log_activity(
        db=db,
        user_id=subject,
        action_type="login",
        details={"provider": "google"},
        ip=_get_client_ip(request),
    )
    return {"user": _claims_to_user(user_claims), "access_token": token}


@router.get("/google-client-id")
def google_client_id_config():
    client_id = str(settings.google_client_id or "").strip()
    if not client_id:
        raise HTTPException(status_code=503, detail="GOOGLE_CLIENT_ID is not configured")
    return {"client_id": client_id}


@router.post("/logout", response_model=SimpleStatusResponse)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(deps.get_db),
    current_user: deps.TokenUser | None = Depends(deps.get_optional_current_user),
):
    secure_cookie, same_site = _resolve_cookie_options(request)
    if current_user:
        log_activity(
            db=db,
            user_id=current_user.id,
            action_type="logout",
            details=None,
            ip=_get_client_ip(request),
        )
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
        "full_name": payload.full_name.strip(),
        "picture_url": current_user.picture_url,
        "latitude": current_user.latitude,
        "longitude": current_user.longitude,
        "auth_provider": "google",
    }
    token = create_access_token(current_user.email, current_user.id, token_payload)
    _set_auth_cookie(response, token, request)
    return _claims_to_user(
        {
            "sub": current_user.id,
            "email": current_user.email,
            "role": current_user.role,
            **token_payload,
        }
    )


@router.post("/location", response_model=UserOut)
def update_location(
    payload: UpdateLocationRequest,
    request: Request,
    response: Response,
    current_user: deps.TokenUser = Depends(deps.get_current_user),
):
    token_payload = {
        "full_name": current_user.full_name,
        "picture_url": current_user.picture_url,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "auth_provider": "google",
    }
    token = create_access_token(current_user.email, current_user.id, token_payload)
    _set_auth_cookie(response, token, request)
    return _claims_to_user(
        {
            "sub": current_user.id,
            "email": current_user.email,
            "role": current_user.role,
            **token_payload,
        }
    )


@router.post("/heartbeat")
async def heartbeat(
    request: Request,
    db: Session = Depends(deps.get_db),
    current_user: deps.TokenUser | None = Depends(deps.get_optional_current_user),
):
    if not current_user:
        return {"ok": False}

    try:
        user_agent = request.headers.get("user-agent", "")[:200]
        db.execute(
            text(
                """
                INSERT INTO user_heartbeats (user_id, last_seen, user_agent, updated_at)
                VALUES (:uid, NOW(), :ua, NOW())
                ON CONFLICT (user_id) DO UPDATE
                SET last_seen = NOW(), user_agent = :ua, updated_at = NOW()
                """
            ),
            {"uid": str(current_user.id), "ua": user_agent},
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("Heartbeat failed for user %s: %s", current_user.id, exc)

    return {"ok": True}


@router.get("/mobile-callback", response_class=HTMLResponse)
def mobile_callback(response: Response):
    response.headers["Cache-Control"] = "no-store"
    return MOBILE_AUTH_CALLBACK_HTML
