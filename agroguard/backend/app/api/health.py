from fastapi import APIRouter
import httpx
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from app.services.otp import get_redis

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/health/deep")
async def health_deep():
    db_ok = False
    redis_ok = False
    ml_ok = False

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        db_ok = False

    try:
        redis_ok = bool(get_redis().ping())
    except Exception:
        redis_ok = False

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.ml_service_url}/health")
            ml_ok = resp.status_code == 200
    except Exception:
        ml_ok = False

    overall = db_ok and redis_ok and ml_ok
    return {
        "status": "ok" if overall else "degraded",
        "services": {"database": db_ok, "redis": redis_ok, "ml_service": ml_ok},
    }
