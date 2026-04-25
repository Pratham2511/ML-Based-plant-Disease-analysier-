import json
import uuid as uuid_lib
import app.db.base  # Ensure all models are registered before any DB setup
import logging
import traceback
from io import BytesIO
from pathlib import Path

import numpy as np
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from PIL import Image
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.session import engine

from app.api import admin, area_intelligence, auth, deps, health, mandi_prices, medicine, scans
from app.core.config import settings
from app.models.scan_history import ScanHistory
from app.utils.storage import upload_to_r2

try:
    from app.api import farms
except ImportError:
    farms = None

app = FastAPI(title=settings.app_name)
logger = logging.getLogger("shetvaidya.inference")

_MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
_MODEL_CANDIDATES = [
    _MODELS_DIR / "shetvaidya_max_accuracy.keras",
    _MODELS_DIR / "agroguard_max_accuracy.keras",
]
MODEL_PATH = next((candidate for candidate in _MODEL_CANDIDATES if candidate.exists()), _MODEL_CANDIDATES[0])
DISEASE_DB_PATH = Path(__file__).resolve().parent.parent / "disease_database.json"

CONFIDENCE_THRESHOLD = 0.35
NOT_A_LEAF_THRESHOLD = 0.70
MAX_UPLOAD_BYTES = 5 * 1024 * 1024

model = None
tf_runtime = None


def maybe_raise_alert(db: Session, alert_type: str, message: str, severity: str = "warning") -> None:
    try:
        existing = db.execute(
            text(
                """
                SELECT id
                FROM admin_alerts
                WHERE alert_type = :atype AND created_at > NOW() - INTERVAL '30 minutes'
                LIMIT 1
                """
            ),
            {"atype": alert_type},
        ).fetchone()

        if not existing:
            db.execute(
                text(
                    """
                    INSERT INTO admin_alerts (alert_type, message, severity)
                    VALUES (:atype, :msg, :sev)
                    """
                ),
                {"atype": alert_type, "msg": message, "sev": severity},
            )
            db.commit()
    except Exception:
        db.rollback()


def ensure_medicine_verification_schema() -> None:
    """Backfill missing medicine verification schema pieces for older deployments."""
    statements = [
        "ALTER TABLE medicine_batches ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE medicine_batches ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ NULL",
        "ALTER TABLE medicine_batches ADD COLUMN IF NOT EXISTS used_by_district VARCHAR(100) NULL",
        "ALTER TABLE medicine_batches ADD COLUMN IF NOT EXISTS scan_count INT NOT NULL DEFAULT 0",
        """
        CREATE TABLE IF NOT EXISTS bottle_codes (
            id UUID PRIMARY KEY,
            medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
            batch_id UUID NOT NULL REFERENCES medicine_batches(id) ON DELETE CASCADE,
            bottle_number INT NOT NULL,
            unique_code VARCHAR(50) UNIQUE NOT NULL,
            is_used BOOLEAN NOT NULL DEFAULT FALSE,
            used_at TIMESTAMPTZ NULL,
            used_by_user_id UUID NULL REFERENCES users(id),
            used_by_district VARCHAR(100) NULL,
            scan_count INT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_bottle_codes_unique_code ON bottle_codes(unique_code)",
        "CREATE INDEX IF NOT EXISTS idx_bottle_codes_batch_id ON bottle_codes(batch_id)",
        "CREATE INDEX IF NOT EXISTS idx_bottle_codes_medicine_id ON bottle_codes(medicine_id)",
    ]

    try:
        with engine.begin() as conn:
            for statement in statements:
                conn.execute(text(statement))
    except Exception:
        logger.exception("Failed to ensure medicine verification schema")


@app.on_event("startup")
def startup_schema_checks() -> None:
    ensure_medicine_verification_schema()

CLASS_NAMES = [
    "healthy",
    "unhealthy",
    "yellow",
    "not_a_leaf"
]

if DISEASE_DB_PATH.exists():
    with DISEASE_DB_PATH.open("r", encoding="utf-8") as f:
        DISEASE_DATABASE = json.load(f)
else:
    DISEASE_DATABASE = {}

def clean_class_name(raw_class: str) -> str:
    return " ".join(raw_class.replace("___", "-").replace("_", " ").split())

def get_local_model():
    global model, tf_runtime
    if model is not None:
        return model
    import tensorflow as tf
    tf.config.threading.set_inter_op_parallelism_threads(1)
    tf.config.threading.set_intra_op_parallelism_threads(1)
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model file not found at {MODEL_PATH}")
    tf_runtime = tf
    model = tf.keras.models.load_model(str(MODEL_PATH), compile=False)
    logger.info("Local inference model lazy-loaded from %s", MODEL_PATH)
    return model

def normalize_prediction_vector(preds: np.ndarray) -> np.ndarray:
    preds = np.asarray(preds, dtype=np.float32).reshape(-1)
    if not np.all(np.isfinite(preds)):
        raise ValueError("Model output contains non-finite values")
    total = float(np.sum(preds))
    if np.all(preds >= 0.0) and total > 0 and abs(total - 1.0) <= 1e-3:
        return preds
    shifted = preds - float(np.max(preds))
    exp_preds = np.exp(shifted)
    exp_sum = float(np.sum(exp_preds))
    if exp_sum <= 0:
        raise ValueError("Model output could not be normalized")
    return exp_preds / exp_sum

def run_inference_with_fallback(model, image_array: np.ndarray) -> tuple[np.ndarray, str]:
    global tf_runtime
    if tf_runtime is None:
        import tensorflow as tf
        tf_runtime = tf
    mobilenet_input = np.expand_dims(
        tf_runtime.keras.applications.mobilenet_v2.preprocess_input(image_array.copy()),
        axis=0,
    )
    current = model.predict(mobilenet_input, verbose=0)[0]
    normalized = normalize_prediction_vector(current)
    return normalized, "mobilenet_v2"

def build_disease_data(class_name: str) -> dict:
    entry = DISEASE_DATABASE.get(class_name, {})
    return {
        "disease_name": entry.get("disease_name") or clean_class_name(class_name),
        "description": entry.get("description", ""),
        "cause": entry.get("cause", ""),
        "treatment": entry.get("treatment", ""),
        "medicine": entry.get("medicine", "N/A"),
    }

if settings.environment == "production":
    app.add_middleware(HTTPSRedirectMiddleware)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

cors_origins = [str(origin).rstrip("/") for origin in settings.backend_cors_origins]

# Development fallback when env values are not configured.
if not cors_origins:
    cors_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root_status():
    return {
        "service": settings.app_name,
        "status": "ok",
        "health": "/health",
        "auth": "/auth/google",
    }

app.include_router(health.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(scans.router, prefix="/scans", tags=["scans"])
app.include_router(medicine.router, prefix="/medicine", tags=["medicine"])
app.include_router(mandi_prices.router, prefix="/api", tags=["mandi"])
app.include_router(area_intelligence.router, prefix="/area-intelligence", tags=["area-intelligence"])
if farms is not None:
    app.include_router(farms.router, prefix="/farms", tags=["farms"])

# Guard optional auth dependency to avoid startup crashes from partial module loads.
optional_current_user_dep = getattr(deps, "get_optional_current_user", lambda: None)

@app.post("/api/predict")
async def predict(
    file: UploadFile = File(...),
    farm_id: str | None = Form(default=None),
    crop_type: str | None = Form(default=None),
    current_user = Depends(optional_current_user_dep),
    db: Session = Depends(deps.get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded image is too large.")
        
    try:
        farm_uuid = None
        if farm_id:
            try:
                farm_uuid = uuid_lib.UUID(str(farm_id))
            except (ValueError, AttributeError, TypeError):
                farm_uuid = None
                logger.warning("Invalid farm_id received on /api/predict: %s, saving as null", farm_id)

        img = Image.open(BytesIO(image_bytes)).convert("RGB").resize((224, 224))
        image_array = np.array(img, dtype=np.float32)
        model = get_local_model()
        preds, selected_pipeline = run_inference_with_fallback(model, image_array)
        
        top3_idx = np.argsort(preds)[-3:][::-1]
        top1_idx = int(top3_idx[0])
        
        raw_class = CLASS_NAMES[top1_idx] if top1_idx < len(CLASS_NAMES) else f"class_{top1_idx}"
        confidence = float(preds[top1_idx])

        # If model is very confident it is not a leaf, reject it
        if raw_class == "not_a_leaf" and confidence >= NOT_A_LEAF_THRESHOLD:
            return {
                "success": False,
                "error": "Image not recognized. Please upload a clear, close-up photo of a money plant leaf."
            }

        # If not_a_leaf but confidence is low, the model is unsure — treat as unhealthy instead of rejecting
        if raw_class == "not_a_leaf" and confidence < NOT_A_LEAF_THRESHOLD:
            raw_class = "healthy"
            confidence = round(1.0 - confidence, 4)

        # For all valid leaf classes reject only if confidence is very low
        if raw_class != "not_a_leaf" and confidence < CONFIDENCE_THRESHOLD:
            return {
                "success": False,
                "error": "Could not analyse the leaf clearly. Please try again in better lighting with the leaf close to the camera."
            }

        disease_name = clean_class_name(raw_class)
        confidence_percent = round(confidence * 100.0, 2)

        top_predictions = [
            {
                "raw_class": CLASS_NAMES[int(i)] if int(i) < len(CLASS_NAMES) else f"class_{int(i)}",
                "disease_name": clean_class_name(CLASS_NAMES[int(i)] if int(i) < len(CLASS_NAMES) else f"class_{int(i)}"),
                "confidence": round(float(preds[int(i)]) * 100.0, 2),
            }
            for i in top3_idx
        ]
            
        disease_data = build_disease_data(raw_class)

        history_id = None
        image_url = None
        if current_user is not None:
            auth.log_activity(
                db=db,
                user_id=str(current_user.id),
                action_type="scan",
                details={"farm_id": str(farm_uuid) if farm_uuid else None, "crop_type": crop_type},
            )
            try:
                logger.info("Attempting scan persistence for user=%s", current_user.id)
                image_url = upload_to_r2(file.filename or "leaf.jpg", image_bytes, file.content_type or "image/jpeg")
                user_uuid = None
                try:
                    user_uuid = uuid_lib.UUID(str(current_user.id))
                except (ValueError, AttributeError, TypeError):
                    logger.warning("Invalid current_user.id on /api/predict: %s, saving as null", current_user.id)

                record = ScanHistory(
                    user_id=user_uuid,
                    farm_id=farm_uuid,
                    disease_name=disease_name,
                    confidence=confidence,
                    image_url=image_url,
                    crop_type=crop_type,
                    top_predictions=top_predictions,
                    analysis_json=json.dumps(
                        {
                            "raw_class": raw_class,
                            "disease_name": disease_name,
                            "confidence": confidence_percent,
                            "debug_pipeline": selected_pipeline,
                            "top_predictions": top_predictions,
                            "disease_data": disease_data,
                        }
                    ),
                )
                db.add(record)
                db.commit()
                db.refresh(record)
                history_id = str(record.id)
                logger.info("Scan saved successfully: user=%s scan_id=%s", current_user.id, history_id)
            except Exception:
                db.rollback()
                logger.exception("Failed to persist scan history for user %s", current_user.id)

        return {
            "success": True,
            "raw_class": raw_class or None,
            "disease_name": disease_name,
            "confidence": confidence_percent,
            "disease_data": disease_data,
            "debug_pipeline": selected_pipeline,
            "top_predictions": top_predictions,
            "model_warning": "uniform_output" if float(np.std(preds)) <= 1e-6 else None,
            "history_id": history_id,
            "farm_id": str(farm_uuid) if farm_uuid else None,
            "image_url": image_url,
        }
    except HTTPException:
        maybe_raise_alert(db, "failed_scan_spike", "Failed scan detected: prediction request rejected", "warning")
        raise
    except Exception as exc:
        traceback.print_exc()
        logger.exception("Local prediction pipeline failed")
        maybe_raise_alert(db, "failed_scan_spike", f"Failed scan detected: {str(exc)}", "warning")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}")