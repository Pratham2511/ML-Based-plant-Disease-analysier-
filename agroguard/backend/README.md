# AgroGuard API

## Endpoints
- `GET /health` – liveness
- `GET /health/deep` – backend + db + redis + ml-service dependency checks
- `POST /auth/register` – email + password + lat/lng; bcrypt hashed
- `POST /auth/login-request` – issues 6-digit OTP (stored in Redis + DB)
- `POST /auth/login-verify` – verifies OTP, issues JWT (HttpOnly cookie `agroguard_token`)
- `GET /auth/me` – current authenticated user
- `POST /auth/logout` – clears auth cookie
- `POST /auth/change-email-request` – triggers OTP for email change
- `POST /auth/change-email-verify` – completes email change after OTP
- `POST /auth/location` – updates profile geolocation
- `GET /scans` – list recent scan history for user
- `POST /scans/analyze` – upload image (≤5MB, jpeg/png), proxied to ML service, stores history
- `GET /medicine/verify/{batch_code}` – batch-level authenticity check

## Security
- JWT signed with HS256, 1h expiry, HttpOnly cookie
- CORS restricted via `BACKEND_CORS_ORIGINS`
- Redis-backed API rate limiting for OTP requests/verifications and batch verification
- OTP lifecycle: generation, expiration, and one-time consumption on success
- Input validation via Pydantic; SQLAlchemy ORM with parameter binding

## Models
See [db/schema.sql](db/schema.sql) for normalized schema.

## Environment
See [.env.example](.env.example). Ensure ML service URL points to private Render service.

## Run
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
