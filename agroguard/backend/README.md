# AgroGuard API

## Endpoints
- `GET /health` – liveness
- `GET /health/deep` – backend + db + redis + ml-service dependency checks
- `POST /auth/google` – verifies Google ID token, creates/updates user, issues JWT (HttpOnly cookie `agroguard_token`)
- `GET /auth/me` – current authenticated user
- `POST /auth/logout` – clears auth cookie
- `POST /auth/profile` – updates user display name
- `POST /auth/location` – updates profile geolocation
- `GET /scans` – list recent scan history for user
- `POST /scans/analyze` – upload image (≤5MB, jpeg/png), proxied to ML service, stores history
- `GET /medicine/verify/{batch_code}` – batch-level authenticity check

## Security
- JWT signed with HS256, 1h expiry, HttpOnly cookie
- CORS restricted via `BACKEND_CORS_ORIGINS`
- Google ID token verification via `google-auth` against `GOOGLE_CLIENT_ID`
- Redis-backed API rate limiting for Google sign-in and batch verification
- Input validation via Pydantic; SQLAlchemy ORM with parameter binding

## Models
See [db/schema.sql](db/schema.sql) for normalized schema.

## Environment
See [.env.example](.env.example). Ensure `ML_SERVICE_URL` points to your active inference endpoint.

## Run
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
