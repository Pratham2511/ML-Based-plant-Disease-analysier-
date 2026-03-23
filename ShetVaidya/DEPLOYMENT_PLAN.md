# ShetVaidya Deployment Plan (Vercel + Hugging Face Spaces + Cloudflare R2)

## 1) Architecture
- Frontend: Vite React app on Vercel
- Backend: FastAPI container on Hugging Face Spaces (Docker)
- ML Inference: TensorFlow MobileNetV2 (single Keras model pipeline)
- Data: Managed PostgreSQL + Managed Redis
- Storage: Cloudflare R2 (S3-compatible)

## 2) Service Wiring
- Frontend `VITE_API_URL` -> Hugging Face Spaces backend URL
- Backend `ML_SERVICE_URL` -> ML inference URL (same service or dedicated endpoint)
- Backend connects to managed PostgreSQL and Redis via connection URLs
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
- `ALLOWED_HOSTS=["<your-hf-space-domain>"]`
- `ML_SERVICE_URL=<private-ml-url>`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`

## 4) ML Service Required Env
- `MODEL_PATH=/app/model`
- `TF_CPP_MIN_LOG_LEVEL=2`

## 5) Hugging Face Spaces Setup
- Build backend from `backend/Dockerfile`
- Build ML service from `ml-service/Dockerfile` if deployed separately
- Set all environment variables in Space Secrets
- Restrict CORS/allowed hosts to your Vercel and Space domains

## 6) Database Bootstrap
- Run `backend/db/schema.sql`
- Seed `diseases` and `medicines` catalog with normalized records
- Generate `medicine_batches` per production batch (100 bottles per code)

## 7) Cold Start Mitigation
- Prefer Space hardware that avoids aggressive sleep for production endpoints
- Keep model warm by running startup health checks during deployment

## 8) CI/CD
- Existing workflow `.github/workflows/ci.yml` builds frontend and static-checks Python services
- Main branch pushes trigger CI automatically

## 9) Security Checklist
- HttpOnly JWT cookie enabled
- OTP TTL and one-time consume enabled
- API rate limits for OTP and batch verification
- Strict CORS origins and host allowlist
- Upload mime and size checks
