from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..middleware.auth import get_current_user
from ..models.approval import (
    find_approval_by_id,
    list_approvals,
    update_approval_status,
)

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


class DecisionRequest(BaseModel):
    reason: Optional[str] = None


@router.get("")
def get_approvals(current_user: dict = Depends(get_current_user)):
    approvals = list_approvals(current_user["workspace_id"])
    return {"approvals": approvals}


@router.post("/{approval_id}/approve")
def approve_action(
    approval_id: str,
    body: Optional[DecisionRequest] = None,
    current_user: dict = Depends(get_current_user),
):
    appr = find_approval_by_id(approval_id)
    if not appr or str(appr["workspace_id"]) != current_user["workspace_id"]:
        raise HTTPException(status_code=404, detail="Approval not found.")

    updated = update_approval_status(
        approval_id,
        status="approved",
        resolved_by=current_user["id"],
    )
    return {"approval": updated}


@router.post("/{approval_id}/reject")
def reject_action(
    approval_id: str,
    body: Optional[DecisionRequest] = None,
    current_user: dict = Depends(get_current_user),
):
    appr = find_approval_by_id(approval_id)
    if not appr or str(appr["workspace_id"]) != current_user["workspace_id"]:
        raise HTTPException(status_code=404, detail="Approval not found.")

    updated = update_approval_status(
        approval_id,
        status="rejected",
        resolved_by=current_user["id"],
    )
    return {"approval": updated}
