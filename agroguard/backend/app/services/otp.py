import logging
import random
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage
from typing import Optional

import redis
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.otp import OTPVerification
from app.utils.security import hash_otp

_pool: Optional[redis.Redis] = None
logger = logging.getLogger(__name__)


def _redis_key(user_id, purpose: str) -> str:
    return f"otp:{user_id}:{purpose}"


def get_redis() -> redis.Redis:
    global _pool
    if _pool is None:
        _pool = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    return _pool


def generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


def store_otp(db: Session, user_id, purpose: str, otp: str) -> None:
    hashed = hash_otp(otp)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.otp_exp_minutes)
    ttl_seconds = settings.otp_exp_minutes * 60
    try:
        redis_client = get_redis()
        redis_client.setex(_redis_key(user_id, purpose), ttl_seconds, hashed)
    except Exception as exc:
        logger.warning("Unable to write OTP to Redis: %s", exc)
    record = OTPVerification(user_id=user_id, otp_hash=hashed, purpose=purpose, expires_at=expires_at)
    db.add(record)
    db.commit()


def fetch_otp(db: Session, user_id, purpose: str) -> Optional[str]:
    try:
        redis_client = get_redis()
        cached = redis_client.get(_redis_key(user_id, purpose))
        if cached:
            return cached
    except Exception as exc:
        logger.warning("Unable to read OTP from Redis: %s", exc)

    row = (
        db.query(OTPVerification)
        .filter(OTPVerification.user_id == user_id, OTPVerification.purpose == purpose)
        .order_by(OTPVerification.created_at.desc())
        .first()
    )
    if not row or row.expires_at < datetime.utcnow():
        return None
    return row.otp_hash


def consume_otp(db: Session, user_id, purpose: str) -> None:
    try:
        redis_client = get_redis()
        redis_client.delete(_redis_key(user_id, purpose))
    except Exception as exc:
        logger.warning("Unable to delete OTP from Redis: %s", exc)

    (
        db.query(OTPVerification)
        .filter(OTPVerification.user_id == user_id, OTPVerification.purpose == purpose)
        .delete(synchronize_session=False)
    )
    db.commit()


def send_otp(email: str, otp: str) -> None:
    subject = "AgroGuard OTP Verification"
    body = (
        "Your AgroGuard OTP is: "
        f"{otp}\n\n"
        f"This OTP expires in {settings.otp_exp_minutes} minutes. "
        "If you did not request this, ignore this email."
    )

    # Dev fallback: keep flow testable without SMTP credentials.
    if not settings.smtp_host or not settings.smtp_from:
        logger.info("OTP for %s: %s", email, otp)
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = email
    msg.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)
