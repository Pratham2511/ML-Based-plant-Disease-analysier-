import json

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.models.scan_history import ScanHistory
from app.utils.storage import upload_to_r2
from app.utils.validators import enforce_image_constraints

router = APIRouter()


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
    image_url = upload_to_r2(file.filename, img_bytes, file.content_type or "image/jpeg")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{settings.ml_service_url}/predict",
            files={"file": (file.filename, img_bytes, file.content_type or "image/jpeg")},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="ML service unavailable")
        prediction = resp.json()

    record = ScanHistory(
        user_id=current_user.id,
        disease_name=prediction.get("disease_name"),
        confidence=prediction.get("confidence"),
        image_url=image_url,
        analysis_json=json.dumps(prediction),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"result": prediction, "history_id": str(record.id), "image_url": image_url}
