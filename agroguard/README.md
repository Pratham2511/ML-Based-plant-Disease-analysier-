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

## Recent updates (March 2026)
- Local disease inference is now integrated in backend prediction flow with lazy model loading for better runtime stability.
- V2.0 prediction safety logic is active:
	- dedicated non-leaf/garbage class rejection
	- confidence gating for unclear or out-of-scope images
	- clear warning response contract for frontend UX handling
- Successful authenticated predictions now persist to scan history and return history metadata in API response.
- Mobile-first dashboard and top navigation polish completed:
	- sticky/floating navbar behavior
	- centered branding with compact controls on small screens
	- improved loading-state behavior for narrow devices
	- drawer and action layout cleanup for Android budget-width screens
- Localization expanded:
	- hardcoded English strings in key flows replaced with i18n keys
	- warning modals, auth alerts, and profile/auth labels localized
	- Marathi/Hindi typography normalized to prevent layout breaks
- Area Intelligence crop cards now use local crop image assets from `frontend/public/plant-images` instead of remote image URLs.

## Data and security guidance
- Keep all secrets in environment files (`.env`) and deployment secret stores only.
- Do not hardcode credentials, tokens, private keys, or bucket secrets in code or docs.
- Public README intentionally lists variable names and architecture, not secret values.
