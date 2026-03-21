# AgroGuard

Production-grade, location-aware plant disease analyzer and batch medicine verification platform.

## Stack
- Frontend: React + Vite (Render Static Site)
- API: FastAPI (Render), PostgreSQL, Redis
- ML: TensorFlow MobileNetV2 inference service (Render private service)
- Storage: Cloudflare R2 for images
- CI/CD: GitHub Actions

## Structure
- `frontend/` React app with router, protected routes, OTP flow, ZXing barcode scan
- `backend/` FastAPI API, JWT HttpOnly cookies, bcrypt, Redis OTP, PostgreSQL models
- `ml-service/` TensorFlow inference microservice and training pipeline
- `.github/workflows/ci.yml` CI for build + static checks
- `.github/workflows/render-keepalive.yml` scheduled health pings for free-tier cold-start mitigation
- `DEPLOYMENT_PLAN.md` cloud deployment runbook for Vercel + Render + R2
- `RENDER_DEPLOYMENT.md` step-by-step Render Blueprint deployment guide
- `render.yaml` Render Blueprint definition for backend + ML + Redis + PostgreSQL

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
- Frontend → Render Static Site using `frontend` build (`npm install && npm run build`)
- Backend → Render Docker using `backend/Dockerfile`
- ML → Render private service using `ml-service/Dockerfile`
- PostgreSQL/Redis → Render managed
- R2 → Cloudflare bucket for images

Use the Render Blueprint at `render.yaml` to provision frontend, backend, ML, Redis, and PostgreSQL together.

## Notes
- OTP expires in 5 minutes, stored in Redis with DB fallback
- Image uploads limited to 5MB and validated by MIME type
- Batch verification uses unique, non-public batch codes per 100-unit batch
- ML model loads once at startup; keep weights lightweight (MobileNetV2)
- API rate limiting is enabled for OTP and batch verification flows
