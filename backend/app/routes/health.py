import datetime
from fastapi import APIRouter

router = APIRouter()


@router.get("/api/health")
def get_health():
    return {
        "status": "ok",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
