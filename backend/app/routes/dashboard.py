from fastapi import APIRouter, Depends
from ..db.connection import query
from ..middleware.auth import get_current_user

router = APIRouter(tags=["dashboard"])


@router.get("/api/dashboard/summary")
def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    ws_id = current_user["workspace_id"]

    docs_res = query(
        "SELECT COUNT(*) as count FROM documents WHERE workspace_id = %s",
        (ws_id,),
    )
    doc_count = docs_res[0]["count"] if docs_res else 0

    conv_res = query(
        "SELECT COUNT(*) as count FROM conversations WHERE workspace_id = %s",
        (ws_id,),
    )
    conv_count = conv_res[0]["count"] if conv_res else 0

    appr_res = query(
        "SELECT COUNT(*) as count FROM approvals WHERE workspace_id = %s AND status = 'pending'",
        (ws_id,),
    )
    appr_count = appr_res[0]["count"] if appr_res else 0

    return {
        "summary": {
            "documentCount": doc_count,
            "conversationCount": conv_count,
            "pendingApprovalsCount": appr_count,
            "workspaceId": ws_id,
        }
    }


@router.get("/api/activity")
def get_activity(current_user: dict = Depends(get_current_user)):
    sql = """
        SELECT a.id, a.user_id, a.action, a.metadata, a.created_at, u.email as user_email
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE u.workspace_id = %s OR a.user_id = %s
        ORDER BY a.created_at DESC
        LIMIT 20
    """
    activities = query(sql, (current_user["workspace_id"], current_user["id"]))
    return {"activities": activities}
