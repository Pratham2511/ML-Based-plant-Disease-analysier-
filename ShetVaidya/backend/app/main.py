import json
import logging
import traceback
from io import BytesIO
from pathlib import Path

import numpy as np
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from PIL import Image
from sqlalchemy.orm import Session

from app.api import area_intelligence, auth, deps, health, medicine, scans
from app.core.config import settings
from app.models.scan_history import ScanHistory
from app.utils.storage import upload_to_r2

app = FastAPI(title=settings.app_name)
logger = logging.getLogger("agroguard.inference")

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "agroguard_max_accuracy.keras"
DISEASE_DB_PATH = Path(__file__).resolve().parent.parent / "disease_database.json"

LOW_CONFIDENCE_THRESHOLD = 0.20
LOW_CONFIDENCE_MARGIN = 0.05
RECOGNITION_THRESHOLD = 0.60
MAX_UPLOAD_BYTES = 5 * 1024 * 1024

model = None
tf_runtime = None

# V2.0 CLASSES LIST (Alphabetically sorted, exactly as trained)
CLASSES = [
    "garbage_not_leaf",                            # Index 0
    "bell_pepper_bacterial_spot",                  # Index 1
    "bell_pepper_healthy",                         # Index 2
    "potato_early_blight",                         # Index 3
    "potato_late_blight",                          # Index 4
    "potato_healthy",                              # Index 5
    "tomato_bacterial_spot",                       # Index 6
    "tomato_early_blight",                         # Index 7
    "tomato_late_blight",                          # Index 8
    "tomato_leaf_mold",                            # Index 9
    "tomato_septoria_leaf_spot",                   # Index 10
    "tomato_spider_mites_two_spotted_spider_mite", # Index 11
    "tomato_target_spot",                          # Index 12
    "tomato_yellow_leaf_curl_virus",               # Index 13
    "tomato_mosaic_virus",                         # Index 14
    "tomato_healthy",                              # Index 15
]

CLASS_TO_DB_KEY = {
    "bell_pepper_bacterial_spot": "Pepper__bell___Bacterial_spot",
    "bell_pepper_healthy": "Pepper__bell___healthy",
    "potato_early_blight": "Potato___Early_blight",
    "potato_late_blight": "Potato___Late_blight",
    "potato_healthy": "Potato___healthy",
    "tomato_bacterial_spot": "Tomato_Bacterial_spot",
    "tomato_early_blight": "Tomato_Early_blight",
    "tomato_late_blight": "Tomato_Late_blight",
    "tomato_leaf_mold": "Tomato_Leaf_Mold",
    "tomato_septoria_leaf_spot": "Tomato_Septoria_leaf_spot",
    "tomato_spider_mites_two_spotted_spider_mite": "Tomato_Spider_mites_Two_spotted_spider_mite",
    "tomato_target_spot": "Tomato__Target_Spot",
    "tomato_yellow_leaf_curl_virus": "Tomato__Tomato_YellowLeaf__Curl_Virus",
    "tomato_mosaic_virus": "Tomato__Tomato_mosaic_virus",
    "tomato_healthy": "Tomato_healthy",
}

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
    raw_input = np.expand_dims(image_array.copy(), axis=0)
    mobilenet_input = np.expand_dims(tf_runtime.keras.applications.mobilenet_v2.preprocess_input(image_array.copy()), axis=0)
    legacy_input = np.expand_dims(image_array / 255.0, axis=0)
    candidate_inputs = [
        ("mobilenet_v2", mobilenet_input),
        ("legacy_0_1", legacy_input),
        ("raw_0_255", raw_input),
    ]
    best_name = ""
    best_preds: np.ndarray | None = None
    best_max_prob = -1.0
    all_preds: list[np.ndarray] = []
    
    for name, candidate in candidate_inputs:
        current = model.predict(candidate, verbose=0)[0]
        normalized = normalize_prediction_vector(current)
        all_preds.append(normalized)
        current_max = float(np.max(normalized))
        current_std = float(np.std(normalized))
        if current_std > 1e-6:
            return normalized, name
        if current_max > best_max_prob:
            best_name = name
            best_preds = normalized
            best_max_prob = current_max
            
    if best_preds is None:
        raise ValueError("Model inference failed for all preprocessing pipelines")
    stacked = np.vstack(all_preds)
    blended = normalize_prediction_vector(np.mean(stacked, axis=0))
    return blended, "ensemble_fallback" if best_name else "unknown"

def build_disease_data(class_name: str) -> dict:
    db_key = CLASS_TO_DB_KEY.get(class_name, class_name)
    entry = DISEASE_DATABASE.get(db_key, {})
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

app.include_router(health.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(scans.router, prefix="/scans", tags=["scans"])
app.include_router(medicine.router, prefix="/medicine", tags=["medicine"])
app.include_router(area_intelligence.router, prefix="/area-intelligence", tags=["area-intelligence"])

@app.post("/api/predict")
async def predict(
    file: UploadFile = File(...),
    current_user: deps.TokenUser | None = Depends(deps.get_optional_current_user),
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
        img = Image.open(BytesIO(image_bytes)).convert("RGB").resize((224, 224))
        image_array = np.array(img, dtype=np.float32)
        model = get_local_model()
        preds, selected_pipeline = run_inference_with_fallback(model, image_array)
        
        top3_idx = np.argsort(preds)[-3:][::-1]
        top1_idx = int(top3_idx[0])
        
        raw_class = CLASSES[top1_idx] if top1_idx < len(CLASSES) else f"class_{top1_idx}"
        disease_name = clean_class_name(raw_class)
        confidence_ratio = float(preds[top1_idx])
        max_confidence = confidence_ratio
        confidence_percent = round(confidence_ratio * 100.0, 2)
        
        # --- THE VERSION 2.0 BOUNCER ---
        # If it predicts Index 0 (Garbage) or the confidence is too low
        if top1_idx == 0 or max_confidence < RECOGNITION_THRESHOLD:
            return {
                "success": False,
                "error": "Image not recognized. Please upload a clear, close-up picture of a plant leaf."
            }

        top_predictions = [
            {
                "raw_class": CLASSES[int(i)] if int(i) < len(CLASSES) else f"class_{int(i)}",
                "disease_name": clean_class_name(CLASSES[int(i)] if int(i) < len(CLASSES) else f"class_{int(i)}"),
                "confidence": round(float(preds[int(i)]) * 100.0, 2),
            }
            for i in top3_idx
        ]
        
        top1_ratio = confidence_ratio
        top2_ratio = 0.0
        if len(top3_idx) > 1:
            top2_ratio = float(preds[int(top3_idx[1])])
        margin = top1_ratio - top2_ratio
        
        if top1_ratio < LOW_CONFIDENCE_THRESHOLD or margin < LOW_CONFIDENCE_MARGIN:
            return {
                "success": False,
                "error_type": "LOW_CONFIDENCE",
                "message": "The image is unclear. Please retake with better focus and lighting.",
                "confidence": confidence_percent,
                "debug_pipeline": selected_pipeline,
                "top_predictions": top_predictions,
            }
            
        disease_data = build_disease_data(raw_class)

        history_id = None
        image_url = None
        if current_user is not None:
            try:
                image_url = upload_to_r2(file.filename or "leaf.jpg", image_bytes, file.content_type or "image/jpeg")
                record = ScanHistory(
                    user_id=current_user.id,
                    disease_name=disease_name,
                    confidence=confidence_ratio,
                    image_url=image_url,
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
            "image_url": image_url,
        }
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        logger.exception("Local prediction pipeline failed")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}")