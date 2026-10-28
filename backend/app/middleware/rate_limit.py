import time
from typing import Dict, List
from fastapi import HTTPException, Request, status

# Simple in-memory sliding window rate limiter
_request_records: Dict[str, List[float]] = {}


def check_rate_limit(request: Request, limit: int = 60, window_sec: int = 60) -> None:
    client_ip = request.client.host if request.client else "unknown"
    key = f"{client_ip}:{request.url.path}"
    now = time.time()

    timestamps = _request_records.get(key, [])
    # Filter out entries older than window_sec
    timestamps = [t for t in timestamps if now - t < window_sec]

    if len(timestamps) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests. Please try again later.",
                }
            },
        )

    timestamps.append(now)
    _request_records[key] = timestamps


def reset_rate_limits() -> None:
    global _request_records
    _request_records.clear()
