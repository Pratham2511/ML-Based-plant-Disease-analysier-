import json
import logging
from pathlib import Path

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.api import area_intelligence, auth, health, medicine, scans
from app.core.config import settings
from app.db import base  # noqa: F401
from app.db.base_class import Base
from app.db.session import engine

# For bootstrap only; production should use Alembic migrations.
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name)
logger = logging.getLogger("agroguard.inference")

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "agroguard_max_accuracy.keras"
DISEASE_DB_PATH = Path(__file__).resolve().parent.parent / "disease_database.json"
LOW_CONFIDENCE_THRESHOLD = 0.20
LOW_CONFIDENCE_MARGIN = 0.05

if DISEASE_DB_PATH.exists():
    with DISEASE_DB_PATH.open("r", encoding="utf-8") as f:
        DISEASE_DATABASE = json.load(f)
else:
    DISEASE_DATABASE = {}


def clean_class_name(raw_class: str) -> str:
    return " ".join(raw_class.replace("___", "-").replace("_", " ").split())

if settings.environment == "production":
    app.add_middleware(HTTPSRedirectMiddleware)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

vercel_origin = "https://ml-based-plant-disease-analysier.vercel.app"
cors_origins = [vercel_origin]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(scans.router, prefix="/scans", tags=["scans"])
app.include_router(medicine.router, prefix="/medicine", tags=["medicine"])
app.include_router(area_intelligence.router, prefix="/area-intelligence", tags=["area-intelligence"])


@app.post("/api/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            resp = await client.post(
                f"{settings.ml_service_url}/predict",
                files={"file": (file.filename or "leaf.jpg", image_bytes, file.content_type or "image/jpeg")},
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="ML service unavailable")

        ml_payload = resp.json()
        raw_class = str(ml_payload.get("disease_name", ""))
        disease_name = clean_class_name(raw_class) if raw_class else "Uncertain prediction"

        confidence_ratio = float(ml_payload.get("confidence", 0.0) or 0.0)
        confidence_percent = round(confidence_ratio * 100.0, 2)

        top_predictions = []
        for item in ml_payload.get("top_predictions", [])[:3]:
            raw_top = str(item.get("disease_name", ""))
            top_predictions.append(
                {
                    "raw_class": raw_top,
                    "disease_name": clean_class_name(raw_top),
                    "confidence": round(float(item.get("confidence", 0.0) or 0.0) * 100.0, 2),
                }
            )

        top1_ratio = confidence_ratio
        top2_ratio = 0.0
        if len(ml_payload.get("top_predictions", [])) > 1:
            top2_ratio = float(ml_payload["top_predictions"][1].get("confidence", 0.0) or 0.0)
        margin = top1_ratio - top2_ratio

        if top1_ratio < LOW_CONFIDENCE_THRESHOLD or margin < LOW_CONFIDENCE_MARGIN:
            return {
                "success": False,
                "error_type": "LOW_CONFIDENCE",
                "message": "The image is unclear. Please retake with better focus and lighting.",
                "confidence": confidence_percent,
                "debug_pipeline": ml_payload.get("debug_pipeline", "ml_service"),
                "top_predictions": top_predictions,
            }

        disease_data = {
            "disease_name": disease_name,
            "description": ml_payload.get("description", ""),
            "cause": ml_payload.get("cause", ""),
            "treatment": ml_payload.get("treatment", ""),
            "medicine": (ml_payload.get("recommended_medicines") or ["N/A"])[0],
        }

        return {
            "success": True,
            "raw_class": raw_class or None,
            "disease_name": disease_name,
            "confidence": confidence_percent,
            "disease_data": disease_data,
            "debug_pipeline": ml_payload.get("debug_pipeline", "ml_service"),
            "top_predictions": top_predictions,
            "model_warning": ml_payload.get("model_warning"),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}")
