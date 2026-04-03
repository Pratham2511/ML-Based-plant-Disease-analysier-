import json
import logging
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import String, cast, inspect, text
from sqlalchemy.orm import Session, load_only

from app.api import deps
from app.core.config import settings
from app.models.scan_history import ScanHistory
from app.utils.storage import upload_to_r2
from app.utils.validators import enforce_image_constraints

router = APIRouter()
logger = logging.getLogger(__name__)

LOW_CONFIDENCE_THRESHOLD = 0.20
LOW_CONFIDENCE_MARGIN = 0.05


def _safe_float(value: object, fallback: float = 0.0) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except Exception:
        return fallback


def _safe_parse_analysis_payload(raw_payload: str | dict | None, scan_id: str) -> dict:
    if isinstance(raw_payload, dict):
        return raw_payload

    if raw_payload is None:
        return {}

    text_payload = str(raw_payload).strip()
    if not text_payload:
        return {}

    try:
        parsed = json.loads(text_payload)
        return parsed if isinstance(parsed, dict) else {"raw": parsed}
    except Exception:
        logger.warning("Malformed analysis_json for scan_id=%s", scan_id)
        return {"raw": text_payload}


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


def _serialize_scan_item(
    *,
    item_id: object,
    disease_name: object,
    confidence: object,
    image_url: object,
    analysis_payload: object,
    timestamp: object,
    farm_id: object | None,
) -> dict:
    return {
        "id": str(item_id),
        "farm_id": str(farm_id) if farm_id else None,
        "disease_name": str(disease_name or ""),
        "confidence": _safe_float(confidence),
        "image_url": str(image_url or ""),
        "analysis_json": _safe_parse_analysis_payload(analysis_payload, str(item_id)),
        "timestamp": timestamp,
    }


@router.get("")
def list_scans(current_user=Depends(deps.get_current_user), db: Session = Depends(deps.get_db)):
    user_id_text = str(current_user.id)

    try:
        items = (
            db.query(ScanHistory)
            .filter(cast(ScanHistory.user_id, String) == user_id_text)
            .order_by(ScanHistory.created_at.desc())
            .limit(50)
            .all()
        )
        return {
            "items": [
                _serialize_scan_item(
                    item_id=item.id,
                    farm_id=getattr(item, "farm_id", None),
                    disease_name=item.disease_name,
                    confidence=item.confidence,
                    image_url=item.image_url,
                    analysis_payload=item.analysis_json,
                    timestamp=item.created_at,
                )
                for item in items
            ]
        }
    except Exception:
        db.rollback()
        logger.exception("Primary scan history query failed, retrying with legacy-safe projection")
        try:
            # Older deployments may not have all latest columns (for example farm_id).
            items = (
                db.query(ScanHistory)
                .options(
                    load_only(
                        ScanHistory.id,
                        ScanHistory.user_id,
                        ScanHistory.disease_name,
                        ScanHistory.confidence,
                        ScanHistory.image_url,
                        ScanHistory.analysis_json,
                        ScanHistory.created_at,
                    )
                )
                .filter(cast(ScanHistory.user_id, String) == user_id_text)
                .order_by(ScanHistory.created_at.desc())
                .limit(50)
                .all()
            )
            return {
                "items": [
                    _serialize_scan_item(
                        item_id=item.id,
                        farm_id=None,
                        disease_name=item.disease_name,
                        confidence=item.confidence,
                        image_url=item.image_url,
                        analysis_payload=item.analysis_json,
                        timestamp=item.created_at,
                    )
                    for item in items
                ]
            }
        except Exception:
            db.rollback()
            logger.exception("Legacy-safe ORM scan history query failed, trying raw SQL fallback")

    try:
        inspector = inspect(db.bind)
        columns = {column["name"] for column in inspector.get_columns("scan_history")}

        required_columns = {"id", "user_id", "disease_name", "confidence", "image_url", "analysis_json"}
        if not required_columns.issubset(columns):
            logger.warning("scan_history schema missing required columns: %s", sorted(required_columns - columns))
            return {"items": []}

        selected_columns = ["id", "disease_name", "confidence", "image_url", "analysis_json"]
        has_farm_id = "farm_id" in columns
        has_created_at = "created_at" in columns

        if has_farm_id:
            selected_columns.append("farm_id")
        if has_created_at:
            selected_columns.append("created_at")

        order_clause = " ORDER BY created_at DESC" if has_created_at else ""
        sql = text(
            f"SELECT {', '.join(selected_columns)} "
            "FROM scan_history "
            "WHERE CAST(user_id AS TEXT) = :user_id"
            f"{order_clause} "
            "LIMIT 50"
        )
        rows = db.execute(sql, {"user_id": user_id_text}).mappings().all()

        return {
            "items": [
                _serialize_scan_item(
                    item_id=row.get("id"),
                    farm_id=row.get("farm_id") if has_farm_id else None,
                    disease_name=row.get("disease_name"),
                    confidence=row.get("confidence"),
                    image_url=row.get("image_url"),
                    analysis_payload=row.get("analysis_json"),
                    timestamp=row.get("created_at") if has_created_at else None,
                )
                for row in rows
            ]
        }
    except Exception:
        logger.exception("Raw SQL scan history fallback failed; returning empty history")
        return {"items": []}


@router.post("/analyze")
async def analyze_leaf(
    file: UploadFile = File(...),
    farm_id: str | None = Form(default=None),
    current_user=Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    enforce_image_constraints(file)
    farm_uuid = None
    if farm_id:
        try:
            farm_uuid = UUID(str(farm_id))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid farm_id") from exc

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
        farm_id=farm_uuid,
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
    return {
        "success": True,
        "result": prediction,
        "history_id": str(record.id),
        "farm_id": str(farm_uuid) if farm_uuid else None,
        "image_url": image_url,
    }
