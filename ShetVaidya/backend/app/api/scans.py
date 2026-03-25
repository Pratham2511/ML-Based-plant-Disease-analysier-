import json
import logging

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.models.scan_history import ScanHistory
from app.utils.storage import upload_to_r2
from app.utils.validators import enforce_image_constraints

router = APIRouter()
logger = logging.getLogger(__name__)

LOW_CONFIDENCE_THRESHOLD = 0.20
LOW_CONFIDENCE_MARGIN = 0.05


def _is_prediction_accepted(prediction: dict) -> bool:
    disease_name = str(prediction.get("disease_name", "") or "")
    if disease_name == "uncertain_prediction":
        return False

    confidence = float(prediction.get("confidence", 0.0) or 0.0)
    top_predictions = prediction.get("top_predictions") or []
    top2 = 0.0
    if len(top_predictions) > 1:
        top2 = float(top_predictions[1].get("confidence", 0.0) or 0.0)
    margin = confidence - top2

    return confidence >= LOW_CONFIDENCE_THRESHOLD and margin >= LOW_CONFIDENCE_MARGIN


@router.get("")
def list_scans(current_user=Depends(deps.get_current_user), db: Session = Depends(deps.get_db)):
    items = (
        db.query(ScanHistory)
        .filter(ScanHistory.user_id == current_user.id)
        .order_by(ScanHistory.created_at.desc())
        .limit(50)
        .all()
    )
    return {
        "items": [
            {
                "id": str(item.id),
                "disease_name": item.disease_name,
                "confidence": item.confidence,
                "image_url": item.image_url,
                "analysis_json": json.loads(item.analysis_json),
                "timestamp": item.created_at,
            }
            for item in items
        ]
    }


@router.post("/analyze")
async def analyze_leaf(file: UploadFile = File(...), current_user=Depends(deps.get_current_user), db: Session = Depends(deps.get_db)):
    enforce_image_constraints(file)
    img_bytes = await file.read()

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{settings.ml_service_url}/predict",
            files={"file": (file.filename, img_bytes, file.content_type or "image/jpeg")},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="ML service unavailable")
        prediction = resp.json()

    if not _is_prediction_accepted(prediction):
        return {
            "success": False,
            "error_type": "LOW_CONFIDENCE",
            "message": "The image is unclear. Please retake with better focus and lighting.",
            "result": prediction,
        }

    image_url = upload_to_r2(file.filename, img_bytes, file.content_type or "image/jpeg")

    record = ScanHistory(
        user_id=current_user.id,
        disease_name=prediction.get("disease_name"),
        confidence=prediction.get("confidence"),
        image_url=image_url,
        analysis_json=json.dumps(prediction),
    )
    try:
        db.add(record)
        db.commit()
        db.refresh(record)
        logger.info("Scan saved successfully: user=%s scan_id=%s", current_user.id, record.id)
    except Exception as exc:
        logger.error("Failed to save scan to DB: %s", exc)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save scan")
    return {"success": True, "result": prediction, "history_id": str(record.id), "image_url": image_url}
