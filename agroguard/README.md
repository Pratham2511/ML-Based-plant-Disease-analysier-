# AgroGuard

Production-grade, location-aware plant disease analyzer and batch medicine verification platform.

## Stack
- Frontend: React + Vite (Vercel)
- API: FastAPI (Hugging Face Spaces), PostgreSQL, Redis
- ML: TensorFlow MobileNetV2 inference service
- Storage: Cloudflare R2 for images
- CI/CD: GitHub Actions

## Structure
- `frontend/` React app with router, protected routes, OTP flow, ZXing barcode scan
- `backend/` FastAPI API, JWT HttpOnly cookies, bcrypt, Redis OTP, PostgreSQL models
- `ml-service/` TensorFlow inference microservice and training pipeline
- `.github/workflows/ci.yml` CI for build + static checks
- `DEPLOYMENT_PLAN.md` cloud deployment runbook for Vercel + Hugging Face Spaces + R2

## Environment
Create `.env` files from provided `.env.example` under each service. Key vars:
- Backend: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `ML_SERVICE_URL`, `BACKEND_CORS_ORIGINS`, R2 credentials
- Frontend: `VITE_API_URL`
- ML service: `MODEL_PATH`

## Run locally
```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload

# ML service
cd ml-service && pip install -r requirements.txt
uvicorn app.main:app --reload --port 9000
```

## Deployment targets
- Frontend → Vercel static deployment from `frontend` build (`npm install && npm run build`)
- Backend → Hugging Face Spaces (Docker) using `backend/Dockerfile`
- ML service → Hugging Face Spaces (Docker) using `ml-service/Dockerfile` or backend-local endpoint
- PostgreSQL/Redis → managed services of choice
- R2 → Cloudflare bucket for images

## Notes
- OTP expires in 5 minutes, stored in Redis with DB fallback
- Image uploads limited to 5MB and validated by MIME type
- Batch verification uses unique, non-public batch codes per 100-unit batch
- ML model loads once at startup; keep weights lightweight (MobileNetV2)
- API rate limiting is enabled for OTP and batch verification flows
