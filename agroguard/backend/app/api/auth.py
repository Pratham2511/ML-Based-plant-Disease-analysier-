from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    ChangeEmailRequest,
    ChangeEmailVerifyRequest,
    LoginRequest,
    LoginVerifyRequest,
    RegisterRequest,
    SimpleStatusResponse,
    UpdateProfileRequest,
    UpdateLocationRequest,
    UserOut,
)
from app.services import otp as otp_service
from app.utils.rate_limiter import enforce_rate_limit
from app.utils.security import create_jwt, hash_password, verify_password, verify_otp

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(deps.get_db)):
    normalized_email = payload.email.strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        full_name=payload.full_name,
        email=normalized_email,
        password_hash=hash_password(payload.password),
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login-request", response_model=SimpleStatusResponse)
def login_request(payload: LoginRequest, request: Request, db: Session = Depends(deps.get_db)):
    normalized_email = payload.email.strip().lower()
    client_ip = request.client.host if request.client else "unknown"
    key = f"otp_request:{client_ip}:{normalized_email}"
    enforce_rate_limit(key, settings.otp_request_limit, settings.otp_request_window_seconds)

    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    otp = otp_service.generate_otp()
    otp_service.store_otp(db, user.id, "login", otp)
    otp_service.send_otp(user.email, otp)
    return {"status": "otp_sent"}


@router.post("/login-verify", response_model=AuthResponse)
def login_verify(response: Response, payload: LoginVerifyRequest, request: Request, db: Session = Depends(deps.get_db)):
    normalized_email = payload.email.strip().lower()
    client_ip = request.client.host if request.client else "unknown"
    key = f"otp_verify:{client_ip}:{normalized_email}"
    enforce_rate_limit(key, settings.otp_verify_limit, settings.otp_verify_window_seconds)

    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    hashed = otp_service.fetch_otp(db, user.id, "login")
    if not hashed or not verify_otp(payload.otp, hashed):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired OTP")

    otp_service.consume_otp(db, user.id, "login")
    token = create_jwt({"sub": str(user.id)})
    same_site = "none" if settings.cookie_secure else "lax"
    response.set_cookie(
        key=settings.jwt_cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=same_site,
        max_age=settings.jwt_exp_minutes * 60,
    )
    return {"user": user}


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


@router.post("/change-password", response_model=SimpleStatusResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")
    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different")

    current_user.password_hash = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()
    return {"status": "password_updated"}


@router.post("/change-email-request", response_model=SimpleStatusResponse)
def change_email_request(
    payload: ChangeEmailRequest,
    request: Request,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    normalized_email = payload.email.strip().lower()
    client_ip = request.client.host if request.client else "unknown"
    key = f"email_change_request:{client_ip}:{current_user.id}"
    enforce_rate_limit(key, settings.otp_request_limit, settings.otp_request_window_seconds)

    if db.query(User).filter(func.lower(User.email) == normalized_email, User.id != current_user.id).first():
        raise HTTPException(status_code=400, detail="Email already used")

    purpose = f"email_change:{normalized_email}"
    otp = otp_service.generate_otp()
    otp_service.store_otp(db, current_user.id, purpose, otp)
    otp_service.send_otp(normalized_email, otp)
    return {"status": "otp_sent"}


@router.post("/change-email-verify", response_model=UserOut)
def change_email_verify(
    payload: ChangeEmailVerifyRequest,
    request: Request,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    normalized_email = payload.email.strip().lower()
    client_ip = request.client.host if request.client else "unknown"
    key = f"email_change_verify:{client_ip}:{current_user.id}"
    enforce_rate_limit(key, settings.otp_verify_limit, settings.otp_verify_window_seconds)

    purpose = f"email_change:{normalized_email}"
    hashed = otp_service.fetch_otp(db, current_user.id, purpose)
    if not hashed or not verify_otp(payload.otp, hashed):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP")

    otp_service.consume_otp(db, current_user.id, purpose)
    # require uniqueness
    if db.query(User).filter(func.lower(User.email) == normalized_email, User.id != current_user.id).first():
        raise HTTPException(status_code=400, detail="Email already used")

    current_user.email = normalized_email
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
