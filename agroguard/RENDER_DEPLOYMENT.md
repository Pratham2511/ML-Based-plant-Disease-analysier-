# Render Deployment Guide (AgroGuard)

This repo is now configured for Render Blueprint deployment via `render.yaml`.

## What deploys on Render
- `agroguard-ml` as a **Private Service** (Docker, internal only)
- `agroguard-redis` as **Managed Redis**
- `agroguard-backend` as a **Web Service** (Docker, public API)
- `agroguard-db` as **Managed PostgreSQL**

Frontend can stay on Vercel (recommended with current setup) or be deployed separately as a static site.

## 1) Deploy using Blueprint
1. Push this repository to GitHub.
2. In Render dashboard: **New +** -> **Blueprint**.
3. Select this repo.
4. Render will detect `render.yaml` and create all services.

## 2) Set required secret env vars (backend)
These are marked `sync: false` and must be filled in Render dashboard:
- `JWT_SECRET`
- `BACKEND_CORS_ORIGINS`
- `ALLOWED_HOSTS`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY`
- `R2_SECRET_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE`
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`

Notes:
- `BACKEND_CORS_ORIGINS` should be JSON list format, for example:
  - `["https://your-frontend-domain.vercel.app"]`
- `ALLOWED_HOSTS` should be JSON list, for example:
  - `["agroguard-backend.onrender.com"]`

## 3) Frontend configuration
Set frontend env:
- `VITE_API_URL=https://agroguard-backend.onrender.com`

## 4) Verify live health checks
- Backend: `GET /health`
- Backend deep checks: `GET /health/deep`
- ML service: `GET /health` (private; check from backend deep health)

## 5) Optional keepalive
GitHub Actions workflow exists at `.github/workflows/render-keepalive.yml`.
Set repo secrets:
- `BACKEND_HEALTH_URL`
- `ML_HEALTH_URL`

## 6) Known behavior
- Backend and ML Dockerfiles now bind to `${PORT}` dynamically for Render compatibility.
- Backend accepts `ML_SERVICE_URL` in either full URL or `host:port` form.
