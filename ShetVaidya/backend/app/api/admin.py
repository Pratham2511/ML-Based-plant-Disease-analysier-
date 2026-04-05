from datetime import datetime, timedelta
import logging
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user, get_db

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/metrics")
async def get_metrics(
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    _ = admin
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    try:
        active_now = db.execute(
            text("SELECT COUNT(*) FROM user_heartbeats WHERE last_seen > :t"),
            {"t": now - timedelta(minutes=5)},
        ).scalar() or 0

        active_15m = db.execute(
            text("SELECT COUNT(*) FROM user_heartbeats WHERE last_seen > :t"),
            {"t": now - timedelta(minutes=15)},
        ).scalar() or 0

        active_24h = db.execute(
            text("SELECT COUNT(*) FROM user_heartbeats WHERE last_seen > :t"),
            {"t": now - timedelta(hours=24)},
        ).scalar() or 0

        scans_today = db.execute(
            text("SELECT COUNT(*) FROM scan_history WHERE created_at > :t"),
            {"t": today_start},
        ).scalar() or 0

        failed_scans = db.execute(
            text(
                """
                SELECT COUNT(*)
                FROM scan_history
                WHERE created_at > :t AND (confidence IS NULL OR confidence < 0.60)
                """
            ),
            {"t": today_start},
        ).scalar() or 0

        new_users_today = db.execute(
            text("SELECT COUNT(*) FROM user_heartbeats WHERE updated_at > :t"),
            {"t": today_start},
        ).scalar() or 0

        total_scans = db.execute(text("SELECT COUNT(*) FROM scan_history")).scalar() or 0

        return {
            "active_now": active_now,
            "active_15m": active_15m,
            "active_24h": active_24h,
            "scans_today": scans_today,
            "failed_scans_today": failed_scans,
            "new_users_today": new_users_today,
            "total_scans": total_scans,
            "timestamp": now.isoformat(),
        }
    except Exception as exc:
        logger.error("Metrics fetch failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch metrics")


@router.get("/users")
async def list_users(
    limit: int = 50,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    _ = admin
    try:
        users = db.execute(
            text(
                """
                SELECT
                    h.user_id,
                    h.last_seen,
                    h.user_agent,
                    COUNT(s.id) as scan_count,
                    MAX(s.created_at) as last_scan
                FROM user_heartbeats h
                LEFT JOIN scan_history s ON s.user_id::text = h.user_id
                GROUP BY h.user_id, h.last_seen, h.user_agent
                ORDER BY h.last_seen DESC
                LIMIT :limit
                """
            ),
            {"limit": max(1, min(limit, 200))},
        ).fetchall()

        return {
            "users": [
                {
                    "user_id": row[0],
                    "last_seen": str(row[1]),
                    "user_agent": row[2],
                    "scan_count": row[3],
                    "last_scan": str(row[4]) if row[4] else None,
                }
                for row in users
            ]
        }
    except Exception as exc:
        logger.error("User list failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch users")


@router.get("/activity")
async def get_activity_feed(
    limit: int = 50,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    _ = admin
    try:
        activities = db.execute(
            text(
                """
                SELECT user_id, action_type, details, ip_address, created_at
                FROM activity_log
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {"limit": max(1, min(limit, 200))},
        ).fetchall()

        return {
            "activities": [
                {
                    "user_id": row[0],
                    "action_type": row[1],
                    "details": row[2],
                    "ip_address": row[3],
                    "created_at": str(row[4]),
                }
                for row in activities
            ]
        }
    except Exception as exc:
        logger.error("Activity feed failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch activity")


@router.get("/health")
async def system_health(
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    _ = admin

    health = {
        "database": False,
        "ml_service": False,
        "api": True,
        "timestamp": datetime.utcnow().isoformat(),
    }

    try:
        db.execute(text("SELECT 1"))
        health["database"] = True
    except Exception:
        pass

    try:
        ml_url = os.getenv("ML_SERVICE_URL", "")
        if ml_url:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{ml_url.rstrip('/')}/health")
                health["ml_service"] = resp.status_code == 200
    except Exception:
        pass

    return health


@router.get("/alerts")
async def get_alerts(
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    _ = admin
    try:
        alerts = db.execute(
            text(
                """
                SELECT id, alert_type, message, severity, is_read, created_at
                FROM admin_alerts
                ORDER BY created_at DESC
                LIMIT 20
                """
            )
        ).fetchall()

        return {
            "alerts": [
                {
                    "id": str(row[0]),
                    "alert_type": row[1],
                    "message": row[2],
                    "severity": row[3],
                    "is_read": row[4],
                    "created_at": str(row[5]),
                }
                for row in alerts
            ]
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch alerts")


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    _ = admin
    db.execute(
        text("UPDATE admin_alerts SET is_read = true WHERE id = :id"),
        {"id": alert_id},
    )
    db.commit()
    return {"ok": True}
