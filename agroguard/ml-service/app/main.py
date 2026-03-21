import os
from io import BytesIO
from functools import lru_cache
from pathlib import Path
from typing import List

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
import tensorflow as tf
from transformers import pipeline

CLASSES: List[str] = [
    "bell_pepper_bacterial_spot",
    "bell_pepper_healthy",
    "potato_early_blight",
    "potato_late_blight",
    "potato_healthy",
    "tomato_bacterial_spot",
    "tomato_early_blight",
    "tomato_late_blight",
    "tomato_leaf_mold",
    "tomato_septoria_leaf_spot",
    "tomato_spider_mites_two_spotted_spider_mite",
    "tomato_target_spot",
    "tomato_yellow_leaf_curl_virus",
    "tomato_mosaic_virus",
    "tomato_healthy",
]

DESCRIPTIONS = {
    "bell_pepper_bacterial_spot": {
        "description": "Small circular lesions on leaves with water-soaked margins.",
        "cause": "Xanthomonas campestris bacterial infection.",
        "treatment": "Use copper-based bactericides and avoid overhead irrigation.",
        "recommended_medicines": ["Copper oxychloride", "Copper hydroxide"],
    },
    "bell_pepper_healthy": {
        "description": "Leaf appears healthy without disease lesions.",
        "cause": "No disease symptoms detected.",
        "treatment": "Continue preventive care and nutrient management.",
        "recommended_medicines": [],
    },
    "potato_early_blight": {
        "description": "Dark concentric leaf spots that expand quickly in warm weather.",
        "cause": "Alternaria solani fungal infection.",
        "treatment": "Apply protectant fungicides and remove infected foliage.",
        "recommended_medicines": ["Mancozeb", "Chlorothalonil"],
    },
    "potato_late_blight": {
        "description": "Rapidly spreading dark lesions with white fungal growth underneath.",
        "cause": "Phytophthora infestans oomycete.",
        "treatment": "Use systemic fungicides and destroy infected plants.",
        "recommended_medicines": ["Metalaxyl + Mancozeb", "Cymoxanil"],
    },
    "potato_healthy": {
        "description": "Leaf appears healthy without disease lesions.",
        "cause": "No disease symptoms detected.",
        "treatment": "Continue preventive monitoring.",
        "recommended_medicines": [],
    },
    "tomato_bacterial_spot": {
        "description": "Small dark lesions on leaves and fruit with raised scabby spots.",
        "cause": "Xanthomonas bacterial infection under warm, humid conditions.",
        "treatment": "Use disease-free seed, avoid overhead irrigation, and apply bactericide.",
        "recommended_medicines": ["Copper oxychloride", "Streptomycin sulfate"],
    },
    "tomato_early_blight": {
        "description": "Dark concentric spots with yellow halos on older leaves.",
        "cause": "Alternaria solani fungus.",
        "treatment": "Use fungicides with chlorothalonil or copper; remove infected debris.",
        "recommended_medicines": ["Chlorothalonil", "Mancozeb"],
    },
    "tomato_late_blight": {
        "description": "Water-soaked lesions turning brown/black; white growth under humid conditions.",
        "cause": "Phytophthora infestans.",
        "treatment": "Apply systemic fungicides (metalaxyl, cymoxanil).",
        "recommended_medicines": ["Metalaxyl", "Cymoxanil + Mancozeb"],
    },
    "tomato_leaf_mold": {
        "description": "Yellow patches on upper leaves and olive-green mold below.",
        "cause": "Passalora fulva fungal infection.",
        "treatment": "Improve ventilation and apply protective fungicides.",
        "recommended_medicines": ["Chlorothalonil", "Copper oxychloride"],
    },
    "tomato_septoria_leaf_spot": {
        "description": "Small circular spots with dark margins and light centers.",
        "cause": "Septoria lycopersici fungal infection.",
        "treatment": "Remove lower infected leaves and spray fungicide.",
        "recommended_medicines": ["Mancozeb", "Chlorothalonil"],
    },
    "tomato_spider_mites_two_spotted_spider_mite": {
        "description": "Leaf stippling, yellowing, and fine webbing.",
        "cause": "Two-spotted spider mite infestation.",
        "treatment": "Use miticides and maintain humidity management.",
        "recommended_medicines": ["Abamectin", "Spiromesifen"],
    },
    "tomato_target_spot": {
        "description": "Circular lesions with concentric rings on leaves and fruit.",
        "cause": "Corynespora cassiicola fungal infection.",
        "treatment": "Use fungicides and reduce prolonged leaf wetness.",
        "recommended_medicines": ["Azoxystrobin", "Chlorothalonil"],
    },
    "tomato_yellow_leaf_curl_virus": {
        "description": "Leaf curling, yellowing, and stunted growth.",
        "cause": "Begomovirus spread by whiteflies.",
        "treatment": "Control whiteflies and remove infected plants.",
        "recommended_medicines": ["Imidacloprid", "Thiamethoxam"],
    },
    "tomato_mosaic_virus": {
        "description": "Mottled leaves, distortion, and reduced vigor.",
        "cause": "Tomato mosaic virus transmission from contaminated tools/seeds.",
        "treatment": "Use resistant varieties and sanitize equipment.",
        "recommended_medicines": [],
    },
    "tomato_healthy": {
        "description": "Leaf appears healthy without disease lesions.",
        "cause": "No disease symptoms detected.",
        "treatment": "Maintain standard agronomic practices.",
        "recommended_medicines": [],
    },
}

MAX_UPLOAD_BYTES = 5 * 1024 * 1024

app = FastAPI(title="AgroGuard ML Service")


HF_MODEL_ID = os.getenv("HF_MODEL_ID", "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification")


def map_external_label_to_internal(label: str) -> str | None:
    text = label.lower().replace("_", " ").replace("-", " ")

    if "pepper" in text and "bacterial" in text:
        return "bell_pepper_bacterial_spot"
    if "pepper" in text and "healthy" in text:
        return "bell_pepper_healthy"

    if "potato" in text and "early" in text and "blight" in text:
        return "potato_early_blight"
    if "potato" in text and "late" in text and "blight" in text:
        return "potato_late_blight"
    if "potato" in text and "healthy" in text:
        return "potato_healthy"

    if "tomato" in text and "bacterial" in text:
        return "tomato_bacterial_spot"
    if "tomato" in text and "early" in text and "blight" in text:
        return "tomato_early_blight"
    if "tomato" in text and "late" in text and "blight" in text:
        return "tomato_late_blight"
    if "tomato" in text and "leaf" in text and "mold" in text:
        return "tomato_leaf_mold"
    if "tomato" in text and "septoria" in text:
        return "tomato_septoria_leaf_spot"
    if "tomato" in text and "spider" in text:
        return "tomato_spider_mites_two_spotted_spider_mite"
    if "tomato" in text and "target" in text and "spot" in text:
        return "tomato_target_spot"
    if "tomato" in text and "yellow" in text and "curl" in text:
        return "tomato_yellow_leaf_curl_virus"
    if "tomato" in text and "mosaic" in text:
        return "tomato_mosaic_virus"
    if "tomato" in text and "healthy" in text:
        return "tomato_healthy"

    return None


@lru_cache()
def load_hf_classifier():
    return pipeline("image-classification", model=HF_MODEL_ID)


def run_hf_inference(img: Image.Image):
    try:
        clf = load_hf_classifier()
        raw = clf(img, top_k=15)
    except Exception:
        return None

    score_by_class: dict[str, float] = {}
    for item in raw:
        label = str(item.get("label", ""))
        mapped = map_external_label_to_internal(label)
        if not mapped:
            continue
        score = float(item.get("score", 0.0))
        score_by_class[mapped] = max(score_by_class.get(mapped, 0.0), score)

    if not score_by_class:
        return None

    ranked = sorted(score_by_class.items(), key=lambda x: x[1], reverse=True)
    total = sum(v for _, v in ranked) or 1.0
    normalized_ranked = [(name, val / total) for name, val in ranked]

    disease_name = normalized_ranked[0][0]
    confidence = float(normalized_ranked[0][1])
    meta = DESCRIPTIONS.get(disease_name, {"description": "", "cause": "", "treatment": "", "recommended_medicines": []})
    top_predictions = [
        {"disease_name": name, "confidence": float(score)}
        for name, score in normalized_ranked[:3]
    ]

    return {
        "disease_name": disease_name,
        "confidence": confidence,
        "crop_type": disease_name.split("_")[0],
        "debug_pipeline": "hf_transformers",
        "top_predictions": top_predictions,
        **meta,
    }


def normalize_prediction_vector(preds: np.ndarray) -> np.ndarray:
    preds = np.asarray(preds, dtype=np.float32)
    if preds.ndim != 1:
        preds = preds.reshape(-1)

    if not np.all(np.isfinite(preds)):
        raise ValueError("Model output contains non-finite values")

    total = float(np.sum(preds))
    if np.all(preds >= 0.0) and total > 0 and abs(total - 1.0) <= 1e-3:
        return preds

    shifted = preds - np.max(preds)
    exp_preds = np.exp(shifted)
    exp_sum = float(np.sum(exp_preds))
    if exp_sum <= 0:
        raise ValueError("Model output could not be normalized")
    return exp_preds / exp_sum


def run_inference_with_fallback(model, image_array: np.ndarray) -> tuple[np.ndarray, str]:
    raw_input = np.expand_dims(image_array.copy(), axis=0)
    mobilenet_input = np.expand_dims(tf.keras.applications.mobilenet_v2.preprocess_input(image_array.copy()), axis=0)
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

    if all_preds:
        stacked = np.vstack(all_preds)
        blended = np.mean(stacked, axis=0)
        blended = normalize_prediction_vector(blended)
        return blended, "ensemble_fallback"

    return best_preds, best_name


@lru_cache()
def load_model():
    base_dir = Path(__file__).resolve().parent.parent
    configured_path = os.getenv("MODEL_PATH")

    candidate_paths = []
    if configured_path:
        candidate_paths.append(Path(configured_path))
        candidate_paths.append(base_dir / configured_path)

    # Fallbacks for local development where model is kept under backend/models.
    candidate_paths.extend(
        [
            base_dir / "model",
            base_dir / "../backend/models/agroguard_max_accuracy.keras",
            base_dir / "../backend/models/agroguard_disease_model.keras",
        ]
    )

    model_path = next((p.resolve() for p in candidate_paths if p.exists()), None)
    if model_path is None:
        raise RuntimeError("Model not found")

    try:
        return tf.keras.models.load_model(str(model_path), compile=False)
    except TypeError:
        import tf_keras

        return tf_keras.models.load_model(str(model_path), compile=False)


@app.get("/health")
def health():
    loaded = True
    try:
        load_model()
    except Exception:
        loaded = False
    return {"status": "ok" if loaded else "degraded", "model_loaded": loaded, "classes": len(CLASSES)}


@app.post("/predict")
def predict(file: UploadFile = File(...)):
    if file.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(status_code=400, detail="Invalid image type")

    image_bytes = file.file.read()
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image too large")

    try:
        img = Image.open(BytesIO(image_bytes)).convert("RGB").resize((224, 224))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid image payload") from exc

    hf_result = run_hf_inference(img)
    if hf_result is not None:
        return hf_result

    image_array = np.array(img, dtype=np.float32)
    model = load_model()
    preds, selected_pipeline = run_inference_with_fallback(model, image_array)
    top3_idx = np.argsort(preds)[-3:][::-1]
    idx = int(top3_idx[0])
    confidence = float(preds[idx])
    disease_name = CLASSES[idx]
    meta = DESCRIPTIONS.get(disease_name, {"description": "", "cause": "", "treatment": "", "recommended_medicines": []})
    top_predictions = [{"disease_name": CLASSES[int(i)], "confidence": float(preds[int(i)])} for i in top3_idx]

    if float(np.std(preds)) <= 1e-6:
        return {
            "disease_name": "uncertain_prediction",
            "confidence": 0.0,
            "crop_type": "unknown",
            "debug_pipeline": selected_pipeline,
            "top_predictions": top_predictions,
            "description": "Model output is uniform across all classes for this image.",
            "cause": "Model artifact appears untrained or exported incorrectly.",
            "treatment": "Retrain or re-export the model; current artifact cannot distinguish diseases.",
            "recommended_medicines": [],
            "model_warning": "uniform_output",
        }

    crop_type = disease_name.split("_")[0]
    return {
        "disease_name": disease_name,
        "confidence": confidence,
        "crop_type": crop_type,
        "debug_pipeline": selected_pipeline,
        "top_predictions": top_predictions,
        **meta,
    }
