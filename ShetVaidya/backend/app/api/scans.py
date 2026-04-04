import json
import logging
import uuid as uuid_lib
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import String, cast
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


class ScanCreateRequest(BaseModel):
    farm_id: Optional[str] = None
    crop_type: Optional[str] = None
    top_predictions: Optional[list[Any]] = None


class ScanHistoryItem(BaseModel):
    id: str
    disease_name: Optional[str]
    confidence: Optional[float]
    image_url: Optional[str]
    created_at: str
    crop_type: Optional[str] = None
    farm_id: Optional[str] = None
    top_predictions: Optional[Any] = None
    analysis_json: Optional[str] = None


def _safe_uuid(value: object | None) -> uuid_lib.UUID | None:
    if value is None:
        return None
    try:
        return uuid_lib.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        return None


def _serialize_scan_item(scan: ScanHistory) -> dict:
    created_at_value = str(scan.created_at) if scan.created_at else ""
    return {
        "id": str(scan.id),
        "disease_name": scan.disease_name,
        "confidence": scan.confidence,
        "image_url": scan.image_url,
        "created_at": created_at_value,
        "timestamp": created_at_value,
        "crop_type": scan.crop_type,
        "farm_id": str(scan.farm_id) if scan.farm_id else None,
        "top_predictions": scan.top_predictions,
        "analysis_json": scan.analysis_json,
    }


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
def list_scans(
    farm_id: str | None = None,
    current_user=Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    user_id_text = str(current_user.id)

    try:
        query = db.query(ScanHistory)
        user_uuid = _safe_uuid(user_id_text)
        if user_uuid is not None:
            query = query.filter(ScanHistory.user_id == user_uuid)
        else:
            query = query.filter(cast(ScanHistory.user_id, String) == user_id_text)

        if farm_id and farm_id != "all":
            farm_uuid = _safe_uuid(farm_id)
            if farm_uuid is not None:
                query = query.filter(ScanHistory.farm_id == farm_uuid)

        scans = query.order_by(ScanHistory.created_at.desc()).limit(50).all()
        scan_items = [_serialize_scan_item(scan) for scan in scans]

        return {
            "scans": scan_items,
            "items": scan_items,
            "total": len(scan_items),
        }
    except Exception as exc:
        logger.error("Failed to fetch scan history: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch scan history")


@router.post("/analyze")
async def analyze_leaf(
    file: UploadFile = File(...),
    farm_id: str | None = Form(default=None),
    crop_type: str | None = Form(default=None),
    top_predictions: str | None = Form(default=None),
    current_user=Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
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

    request_body = ScanCreateRequest(
        farm_id=farm_id,
        crop_type=crop_type,
        top_predictions=None,
    )
    if top_predictions:
        try:
            parsed_top_predictions = json.loads(top_predictions)
            if isinstance(parsed_top_predictions, list):
                request_body.top_predictions = parsed_top_predictions
        except json.JSONDecodeError:
            request_body.top_predictions = None

    history_id = None
    farm_id_value = None
    try:
        if request_body.farm_id:
            try:
                farm_id_value = uuid_lib.UUID(str(request_body.farm_id))
            except (ValueError, AttributeError, TypeError):
                farm_id_value = None
                logger.warning("Invalid farm_id received: %s, saving as null", request_body.farm_id)

        top_predictions_value: object | None = request_body.top_predictions
        if top_predictions_value is None:
            top_predictions_value = prediction.get("top_predictions")
        if isinstance(top_predictions_value, str):
            try:
                top_predictions_value = json.loads(top_predictions_value)
            except json.JSONDecodeError:
                top_predictions_value = None

        current_user_uuid = _safe_uuid(getattr(current_user, "id", None))

        scan_record = ScanHistory(
            user_id=current_user_uuid,
            disease_name=prediction.get("disease_name") or prediction.get("class_name"),
            confidence=prediction.get("confidence"),
            image_url=image_url,
            analysis_json=json.dumps(prediction),
            farm_id=farm_id_value,
            crop_type=request_body.crop_type,
            top_predictions=top_predictions_value,
        )

        db.add(scan_record)
        db.commit()
        db.refresh(scan_record)
        history_id = str(scan_record.id)
        logger.info(
            "Scan saved successfully: id=%s user=%s farm=%s",
            scan_record.id,
            current_user.id if current_user else "anonymous",
            farm_id_value,
        )
    except Exception as exc:
        db.rollback()
        logger.error("Failed to save scan to DB: %s", exc, exc_info=True)

    return {
        "success": True,
        "result": prediction,
        "history_id": history_id,
        "farm_id": str(farm_id_value) if farm_id_value else None,
        "image_url": image_url,
    }
