import os
from io import BytesIO
from functools import lru_cache
from typing import List

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
import tensorflow as tf

CLASSES: List[str] = [
    "bell_pepper_bacterial_spot",
    "bell_pepper_healthy",
    "potato_early_blight",
    "potato_late_blight",
    "potato_healthy",
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


@lru_cache()
def load_model():
    model_path = os.getenv("MODEL_PATH", "./model")
    if not os.path.exists(model_path):
        raise RuntimeError("Model not found")
    return tf.keras.models.load_model(model_path)


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

    arr = tf.keras.applications.mobilenet_v2.preprocess_input(np.array(img))
    arr = np.expand_dims(arr, axis=0)
    model = load_model()
    preds = model.predict(arr, verbose=0)
    idx = int(np.argmax(preds[0]))
    confidence = float(preds[0][idx])
    disease_name = CLASSES[idx]
    meta = DESCRIPTIONS.get(disease_name, {"description": "", "cause": "", "treatment": "", "recommended_medicines": []})
    top3_idx = np.argsort(preds[0])[-3:][::-1]
    top_predictions = [{"disease_name": CLASSES[i], "confidence": float(preds[0][i])} for i in top3_idx]

    crop_type = disease_name.split("_")[0]
    return {
        "disease_name": disease_name,
        "confidence": confidence,
        "crop_type": crop_type,
        "top_predictions": top_predictions,
        **meta,
    }
