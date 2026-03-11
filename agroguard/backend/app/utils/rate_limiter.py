from __future__ import annotations

import threading
import time
from typing import Dict, Tuple

from fastapi import HTTPException, status

from app.services.otp import get_redis

# Local fallback keeps app usable when Redis is unavailable in local/dev.
_local_counter: Dict[str, Tuple[int, float]] = {}
_local_lock = threading.Lock()


def _in_memory_limit(key: str, limit: int, window_seconds: int) -> None:
    now = time.time()
    with _local_lock:
        count, expires_at = _local_counter.get(key, (0, now + window_seconds))
        if now > expires_at:
            count, expires_at = 0, now + window_seconds
        count += 1
        _local_counter[key] = (count, expires_at)
    if count > limit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")


def enforce_rate_limit(key: str, limit: int, window_seconds: int) -> None:
    try:
        redis_client = get_redis()
        redis_key = f"rl:{key}"
        current = redis_client.incr(redis_key)
        if current == 1:
            redis_client.expire(redis_key, window_seconds)
        if current > limit:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")
    except HTTPException:
        raise
    except Exception:
        _in_memory_limit(key, limit, window_seconds)
