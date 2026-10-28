from fastapi import APIRouter, Depends, Query
from ..middleware.auth import get_current_user
from ..services.embedding_service import embedding_service

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
async def search_endpoint(
    q: str = Query(..., min_length=1),
    topK: int = Query(5, ge=1, le=20),
    threshold: float = Query(0.3, ge=0.0, le=1.0),
    current_user: dict = Depends(get_current_user),
):
    results = await embedding_service.search(
        workspace_id=current_user["workspace_id"],
        query_text=q,
        top_k=topK,
        threshold=threshold,
    )
    return {"results": results}
