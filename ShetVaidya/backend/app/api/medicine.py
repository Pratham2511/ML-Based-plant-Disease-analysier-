import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.models.medicine import BottleCode, Medicine, MedicineBatch
from app.models.user import User
from app.utils.rate_limiter import enforce_rate_limit
from app.utils.validators import validate_batch_code

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/verify/{code}")
def verify(code: str, request: Request, db: Session = Depends(deps.get_db), current_user=Depends(deps.get_optional_current_user)):
    client_ip = request.client.host if request.client else "unknown"
    enforce_rate_limit(
        f"batch_verify:{client_ip}",
        settings.medicine_verify_limit,
        settings.medicine_verify_window_seconds,
    )

    clean_code = validate_batch_code(code).upper()

    # --- TIER 1: Per-bottle unique code ---
    bottle = db.query(BottleCode).filter(BottleCode.unique_code == clean_code).first()
    if bottle:
        medicine = db.query(Medicine).filter(Medicine.id == bottle.medicine_id).first()
        batch = db.query(MedicineBatch).filter(MedicineBatch.id == bottle.batch_id).first()

        bottle.scan_count = (bottle.scan_count or 0) + 1

        if bottle.is_used:
            db.commit()
            logger.warning(
                "COUNTERFEIT ALERT: code=%s first_used_at=%s first_used_district=%s total_scans=%s",
                clean_code,
                bottle.used_at,
                bottle.used_by_district,
                bottle.scan_count,
            )
            return {
                "is_valid": False,
                "verification_type": "bottle",
                "warning": "ALREADY_VERIFIED",
                "alert_level": "HIGH",
                "message": "This bottle code has already been verified once. If this is a new sealed bottle, it may be counterfeit. Contact your Krushi Vibhag officer immediately.",
                "first_verified_at": bottle.used_at.isoformat() if bottle.used_at else None,
                "first_verified_district": bottle.used_by_district,
                "scan_count": bottle.scan_count,
                "medicine": {
                    "brand_name": medicine.brand_name if medicine else "Unknown",
                    "company": medicine.company if medicine else "Unknown",
                    "crop_type": medicine.crop_type if medicine else "Unknown",
                    "disease_category": medicine.disease_category if medicine else "Unknown",
                },
            }

        bottle.is_used = True
        bottle.used_at = datetime.now(timezone.utc)
        bottle.used_by_district = getattr(current_user, "district", None) or "Unknown"
        bottle.used_by_user_id = None

        if current_user and getattr(current_user, "id", None):
            try:
                parsed_user_id = UUID(str(current_user.id))
                user_exists = db.query(User.id).filter(User.id == parsed_user_id).first() is not None
                if user_exists:
                    bottle.used_by_user_id = parsed_user_id
            except (TypeError, ValueError):
                bottle.used_by_user_id = None

        try:
            db.commit()
        except IntegrityError:
            # Fallback for environments where auth token identity doesn't map to users.id FK.
            db.rollback()
            bottle = db.query(BottleCode).filter(BottleCode.unique_code == clean_code).first()
            if bottle:
                bottle.scan_count = (bottle.scan_count or 0) + 1
                bottle.is_used = True
                bottle.used_at = datetime.now(timezone.utc)
                bottle.used_by_user_id = None
                bottle.used_by_district = getattr(current_user, "district", None) or "Unknown"
                db.commit()

        logger.info("Bottle code verified first time: code=%s medicine=%s", clean_code, medicine.brand_name if medicine else "Unknown")

        return {
            "is_valid": True,
            "verification_type": "bottle",
            "alert_level": "NONE",
            "message": "Genuine product verified. This is the first verification of this bottle.",
            "bottle_number": bottle.bottle_number,
            "scan_count": bottle.scan_count,
            "medicine": {
                "brand_name": medicine.brand_name if medicine else "Unknown",
                "company": medicine.company if medicine else "Unknown",
                "active_ingredient": medicine.active_ingredient if medicine else "Unknown",
                "concentration": medicine.concentration if medicine else "Unknown",
                "crop_type": medicine.crop_type if medicine else "Unknown",
                "disease_category": medicine.disease_category if medicine else "Unknown",
            },
            "batch": {
                "batch_code": batch.batch_code if batch else "Unknown",
                "manufacture_date": str(batch.manufacture_date) if batch and batch.manufacture_date else "Unknown",
                "batch_size": batch.batch_size if batch else 0,
            },
        }

    # --- TIER 2: Batch code fallback ---
    batch = db.query(MedicineBatch).filter(MedicineBatch.batch_code == clean_code).first()
    if batch:
        medicine = db.query(Medicine).filter(Medicine.id == batch.medicine_id).first()
        batch.scan_count = (batch.scan_count or 0) + 1
        db.commit()

        suspicious = (batch.scan_count or 0) > 100
        return {
            "is_valid": bool(batch.is_valid),
            "verification_type": "batch",
            "alert_level": "MEDIUM" if suspicious else "LOW",
            "message": (
                f"This batch code has been scanned {batch.scan_count} times. Batch codes can be copied. Use bottle-level QR for stronger verification."
                if suspicious
                else "Batch verified. Note: batch codes can be duplicated."
            ),
            "scan_count": batch.scan_count,
            "medicine": {
                "brand_name": medicine.brand_name if medicine else "Unknown",
                "company": medicine.company if medicine else "Unknown",
                "active_ingredient": medicine.active_ingredient if medicine else "Unknown",
                "concentration": medicine.concentration if medicine else "Unknown",
                "crop_type": medicine.crop_type if medicine else "Unknown",
                "disease_category": medicine.disease_category if medicine else "Unknown",
            },
        }

    # --- TIER 3: Unknown code ---
    logger.warning("Unknown code scanned: %s", clean_code)
    return {
        "is_valid": False,
        "verification_type": "unknown",
        "alert_level": "HIGH",
        "message": "This code is not in our database. This product may be counterfeit. Do not use it. Contact your Krushi Vibhag officer.",
        "scan_count": 0,
    }


@router.get("/list")
def list_medicines(crop_type: str | None = None, disease: str | None = None, db: Session = Depends(deps.get_db)):
    query = db.query(Medicine)
    if crop_type:
        query = query.filter(Medicine.crop_type.ilike(f"%{crop_type}%"))
    if disease:
        query = query.filter(Medicine.disease_category.ilike(f"%{disease}%"))

    medicines = query.limit(50).all()
    return {
        "medicines": [
            {
                "id": str(m.id),
                "brand_name": m.brand_name,
                "company": m.company,
                "active_ingredient": m.active_ingredient,
                "concentration": m.concentration,
                "crop_type": m.crop_type,
                "disease_category": m.disease_category,
            }
            for m in medicines
        ]
    }
