from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.models.medicine import Medicine
from app.services.medicine import verify_batch
from app.utils.rate_limiter import enforce_rate_limit
from app.utils.validators import validate_batch_code

router = APIRouter()


@router.get("/verify/{batch_code}")
def verify(batch_code: str, request: Request, db: Session = Depends(deps.get_db)):
    client_ip = request.client.host if request.client else "unknown"
    enforce_rate_limit(
        f"batch_verify:{client_ip}",
        settings.medicine_verify_limit,
        settings.medicine_verify_window_seconds,
    )

    clean_batch_code = validate_batch_code(batch_code)
    batch = verify_batch(db, clean_batch_code)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not valid")
    medicine = db.query(Medicine).filter(Medicine.id == batch.medicine_id).first()
    return {
        "batch_code": batch.batch_code,
        "is_valid": batch.is_valid,
        "medicine": {
            "brand_name": medicine.brand_name if medicine else None,
            "company": medicine.company if medicine else None,
            "active_ingredient": medicine.active_ingredient if medicine else None,
            "concentration": medicine.concentration if medicine else None,
            "crop_type": medicine.crop_type if medicine else None,
            "disease_category": medicine.disease_category if medicine else None,
        },
    }
