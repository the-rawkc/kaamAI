from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from ..middleware.auth import get_current_user
from ..middleware.rate_limit import check_rate_limit
from ..services.ai_factory import get_ai_provider, get_all_providers_health
from ..services.ai_provider import ChatMessage, ChatOptions
from ..services.rag_service import rag_service

router = APIRouter(tags=["ai"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=4000)


class RagChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    topK: int = Field(5, ge=1, le=20)
    threshold: float = Field(0.3, ge=0.0, le=1.0)
    model: Optional[str] = None
    temperature: Optional[float] = Field(0.2, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=4000)


@router.get("/api/providers")
async def list_providers():
    providers = await get_all_providers_health()
    return {"providers": [p.model_dump() for p in providers]}


@router.post("/api/chat")
async def chat_endpoint(
    request: Request,
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    check_rate_limit(request, limit=30, window_sec=60)
    provider = get_ai_provider()
    health = await provider.health()
    if health.status != "ok":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": {
                    "code": "AI_PROVIDER_UNAVAILABLE",
                    "message": f"AI provider ({provider.name}) is not ready: {health.detail or 'Check configuration.'}",
                    "detail": health.detail,
                }
            },
        )

    messages = [
        ChatMessage(
            role="system",
            content="You are KaamAI, a helpful AI business operations assistant.",
        ),
        ChatMessage(role="user", content=body.message),
    ]

    res = await provider.chat(
        messages,
        ChatOptions(
            model=body.model,
            temperature=body.temperature,
            max_tokens=body.max_tokens,
        ),
    )

    return {
        "reply": res.content,
        "model": res.model,
        "usage": res.usage,
    }


@router.post("/api/rag/chat")
async def rag_chat_endpoint(
    request: Request,
    body: RagChatRequest,
    current_user: dict = Depends(get_current_user),
):
    check_rate_limit(request, limit=30, window_sec=60)
    provider = get_ai_provider()
    health = await provider.health()
    if health.status != "ok":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": {
                    "code": "AI_PROVIDER_UNAVAILABLE",
                    "message": f"AI provider ({provider.name}) is not ready: {health.detail or 'Check configuration.'}",
                    "detail": health.detail,
                }
            },
        )

    rag_result = await rag_service.answer_question(
        workspace_id=current_user["workspace_id"],
        question=body.message,
        top_k=body.topK,
        threshold=body.threshold,
        model=body.model,
        temperature=body.temperature or 0.2,
        max_tokens=body.max_tokens,
    )

    return rag_result.model_dump()
