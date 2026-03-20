# AgroGuard ML Service

- TensorFlow MobileNetV2 transfer learning on PlantVillage (Tomato, Potato, Bell Pepper)
- Provides `/health` and `/predict` endpoints
- Model loads once on startup; keep weights small for Render free tier

## Train
```
cd ml-service
python train.py
```
Outputs SavedModel at `model/`.
Also writes:
- `artifacts/confusion_matrix.npy`
- `artifacts/classes.json`

## Run inference
```
uvicorn app.main:app --host 0.0.0.0 --port 9000
```

## Response shape
```
{
  "disease_name": "tomato_early_blight",
  "confidence": 0.93,
  "crop_type": "tomato",
  "description": "...",
  "cause": "...",
  "treatment": "...",
  "recommended_medicines": [],
  "top_predictions": [
    {"disease_name": "tomato_early_blight", "confidence": 0.93}
  ]
}
```
