from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from ..models.conversation import (
    add_message,
    create_conversation,
    find_conversation_by_id,
    get_messages,
    list_conversations,
)
from ..middleware.auth import get_current_user

router = APIRouter(tags=["conversations"])


class CreateConversationRequest(BaseModel):
    title: Optional[str] = "New Conversation"


class AddMessageRequest(BaseModel):
    conversation_id: str
    role: str
    content: str


@router.get("/api/conversations")
def list_conversations_endpoint(current_user: dict = Depends(get_current_user)):
    convs = list_conversations(current_user["workspace_id"])
    return {"conversations": convs}


@router.post("/api/conversations")
def create_conversation_endpoint(
    body: CreateConversationRequest,
    current_user: dict = Depends(get_current_user),
):
    conv = create_conversation(
        workspace_id=current_user["workspace_id"],
        title=body.title or "New Conversation",
    )
    return {"conversation": conv}


@router.get("/api/conversations/{conversation_id}/messages")
def get_conversation_messages_endpoint(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    conv = find_conversation_by_id(conversation_id)
    if not conv or str(conv["workspace_id"]) != current_user["workspace_id"]:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Conversation not found."}},
        )
    msgs = get_messages(conversation_id)
    return {"messages": msgs}


@router.post("/api/messages")
def add_message_endpoint(
    body: AddMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    conv = find_conversation_by_id(body.conversation_id)
    if not conv or str(conv["workspace_id"]) != current_user["workspace_id"]:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Conversation not found."}},
        )
    msg = add_message(body.conversation_id, body.role, body.content)
    return {"message": msg}
