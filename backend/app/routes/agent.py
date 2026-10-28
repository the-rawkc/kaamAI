import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..middleware.auth import get_current_user
from ..models.agent import create_agent_run, find_agent_run_by_id, list_agent_runs
from ..models.conversation import create_conversation
from ..services.agent import AgentOrchestrator

router = APIRouter(prefix="/api/agent", tags=["agent"])


class AgentRunRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    model: Optional[str] = None


@router.post("/run")
async def run_agent_endpoint(
    body: AgentRunRequest, current_user: dict = Depends(get_current_user)
):
    ws_id = current_user["workspace_id"]
    conv_id = body.conversation_id
    if not conv_id:
        conv = create_conversation(ws_id, title=body.message[:40])
        conv_id = str(conv["id"])

    run = create_agent_run(
        conversation_id=conv_id,
        user_id=current_user["id"],
        workspace_id=ws_id,
        message=body.message,
    )

    orchestrator = AgentOrchestrator()
    result = await orchestrator.run(
        run_id=str(run["id"]),
        workspace_id=ws_id,
        message=body.message,
        model=body.model,
    )

    return {
        "run": {
            "id": str(run["id"]),
            "conversation_id": conv_id,
            "status": result["status"],
            "steps": result["steps"],
            "final_answer": result["final_answer"],
        }
    }


@router.get("/runs")
def list_runs(current_user: dict = Depends(get_current_user)):
    runs = list_agent_runs(current_user["workspace_id"])
    return {"runs": runs}


@router.get("/runs/{run_id}")
def get_run(run_id: str, current_user: dict = Depends(get_current_user)):
    run = find_agent_run_by_id(run_id)
    if not run or str(run["workspace_id"]) != current_user["workspace_id"]:
        raise HTTPException(status_code=404, detail="Agent run not found.")
    return {"run": run}
