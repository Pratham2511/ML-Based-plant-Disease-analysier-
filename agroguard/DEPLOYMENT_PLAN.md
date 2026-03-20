# AgroGuard Deployment Plan (Vercel + Render + Cloudflare R2)

## 1) Architecture
- Frontend: Vite React app on Vercel
- Backend: FastAPI container on Render Web Service
- ML Inference: FastAPI + TensorFlow container on Render Private Service
- Data: Render PostgreSQL + Render Redis
- Storage: Cloudflare R2 (S3-compatible)

## 2) Service Wiring
- Frontend `VITE_API_URL` -> Render backend public URL
- Backend `ML_SERVICE_URL` -> private Render ML URL (internal network)
- Backend connects to Render PostgreSQL and Redis via internal URLs
- Backend uploads images to Cloudflare R2 and stores URL in DB

## 3) Backend Required Env
- `ENVIRONMENT=production`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_ALGORITHM=HS256`
- `JWT_EXP_MINUTES=60`
- `COOKIE_SECURE=true`
- `BACKEND_CORS_ORIGINS=["https://<your-vercel-domain>"]`
- `ALLOWED_HOSTS=["<your-render-domain>"]`
- `ML_SERVICE_URL=<private-ml-url>`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`

## 4) ML Service Required Env
- `MODEL_PATH=/app/model`
- `TF_CPP_MIN_LOG_LEVEL=2`

## 5) Render Setup
- Backend build from `backend/Dockerfile`
- ML build from `ml-service/Dockerfile`
- Attach managed PostgreSQL and Redis to backend
- Keep ML service private, only backend should call it

## 6) Database Bootstrap
- Run `backend/db/schema.sql`
- Seed `diseases` and `medicines` catalog with normalized records
- Generate `medicine_batches` per production batch (100 bottles per code)

## 7) Cold Start Mitigation
- Use `.github/workflows/render-keepalive.yml`
- Add GitHub secrets:
  - `BACKEND_HEALTH_URL`
  - `ML_HEALTH_URL`

## 8) CI/CD
- Existing workflow `.github/workflows/ci.yml` builds frontend and static-checks Python services
- Main branch pushes trigger CI automatically

## 9) Security Checklist
- HttpOnly JWT cookie enabled
- OTP TTL and one-time consume enabled
- API rate limits for OTP and batch verification
- Strict CORS origins and host allowlist
- Upload mime and size checks
