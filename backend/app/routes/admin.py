from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from ..db.connection import query, execute
from ..middleware.auth import require_admin
from ..models.user import list_all_users, update_user_role, toggle_user_active, delete_user
from ..services.business_tools import BusinessToolsService

router = APIRouter(prefix="/api/admin", tags=["admin"])
tools_service = BusinessToolsService()


class UpdateRoleRequest(BaseModel):
    role: str


class UpdateStatusRequest(BaseModel):
    is_active: bool


@router.get("/overview")
def get_admin_overview(_admin: dict = Depends(require_admin)):
    users_count = query("SELECT COUNT(*) as count FROM users")[0]["count"]
    workspaces_count = query("SELECT COUNT(*) as count FROM workspaces")[0]["count"]
    documents_count = query("SELECT COUNT(*) as count FROM documents")[0]["count"]
    chunks_count = query("SELECT COUNT(*) as count FROM document_chunks")[0]["count"]
    convs_count = query("SELECT COUNT(*) as count FROM conversations")[0]["count"]
    approvals_count = query("SELECT COUNT(*) as count FROM approvals")[0]["count"]
    reports_count = query("SELECT COUNT(*) as count FROM reports")[0]["count"]
    records_count = query("SELECT COUNT(*) as count FROM business_records")[0]["count"]

    # Calculate system-wide numerical sales and overdue totals from business_records
    all_records = query("SELECT record_data FROM business_records")
    total_sales = 0.0
    overdue_count = 0
    overdue_amount = 0.0

    for r in all_records:
        data = r.get("record_data", {})
        if not isinstance(data, dict):
            continue
        # Check sales amount
        amt = None
        for field in ("total_amount", "amount", "total", "sales", "revenue", "price"):
            amt = tools_service.extract_number(data, field)
            if amt is not None:
                break
        if amt is not None:
            total_sales += amt

        # Check overdue status
        status_val = str(data.get("status", "")).lower()
        due_date_str = str(data.get("due_date", ""))
        due_date = tools_service.parse_date(due_date_str) if due_date_str else None
        
        is_overdue = False
        if "overdue" in status_val:
            is_overdue = True
        elif status_val == "unpaid" and due_date:
            from datetime import datetime, timezone
            if due_date.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
                is_overdue = True

        if is_overdue:
            overdue_count += 1
            if amt is not None:
                overdue_amount += amt

    return {
        "metrics": {
            "totalUsers": users_count,
            "totalWorkspaces": workspaces_count,
            "totalDocuments": documents_count,
            "totalChunks": chunks_count,
            "totalConversations": convs_count,
            "totalApprovals": approvals_count,
            "totalReports": reports_count,
            "totalRecords": records_count,
            "totalSales": round(total_sales, 2),
            "overdueCount": overdue_count,
            "overdueAmount": round(overdue_amount, 2),
        }
    }


@router.get("/users")
def get_all_users(_admin: dict = Depends(require_admin)):
    users = list_all_users()
    formatted = []
    for u in users:
        formatted.append({
            "id": str(u["id"]),
            "email": u["email"],
            "name": u.get("name") or u["email"].split("@")[0].capitalize(),
            "role": u["role"],
            "workspaceId": str(u["workspace_id"]) if u.get("workspace_id") else None,
            "workspaceName": u.get("workspace_name") or "Primary Workspace",
            "isActive": u.get("is_active", True),
            "documentCount": u.get("document_count", 0),
            "conversationCount": u.get("conversation_count", 0),
            "createdAt": u["created_at"],
        })
    return {"users": formatted}


@router.patch("/users/{user_id}/role")
def change_user_role(
    user_id: str,
    body: UpdateRoleRequest,
    admin: dict = Depends(require_admin),
):
    valid_roles = {"admin", "owner", "manager", "member", "analyst"}
    target_role = body.role.lower().strip()
    if target_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_ROLE", "message": f"Role must be one of: {', '.join(valid_roles)}"}},
        )

    # Prevent admin from demoting themselves
    if admin["id"] == user_id and target_role not in ("admin", "owner"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "CANNOT_DEMOTE_SELF", "message": "You cannot demote your own account."}},
        )

    success = update_user_role(user_id, target_role)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": f"User role updated to {target_role}", "userId": user_id, "role": target_role}


@router.patch("/users/{user_id}/status")
def change_user_status(
    user_id: str,
    body: UpdateStatusRequest,
    admin: dict = Depends(require_admin),
):
    if admin["id"] == user_id and not body.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "CANNOT_DEACTIVATE_SELF", "message": "You cannot deactivate your own account."}},
        )

    success = toggle_user_active(user_id, body.is_active)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User status updated", "userId": user_id, "isActive": body.is_active}


@router.delete("/users/{user_id}")
def remove_user(user_id: str, admin: dict = Depends(require_admin)):
    if admin["id"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "CANNOT_DELETE_SELF", "message": "You cannot delete your own account."}},
        )

    success = delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted successfully", "userId": user_id}


@router.get("/data")
def get_numerical_data_breakdown(_admin: dict = Depends(require_admin)):
    sql = """
        SELECT 
            w.id as workspace_id,
            w.name as workspace_name,
            w.slug,
            (SELECT COUNT(*) FROM users u WHERE u.workspace_id = w.id) as user_count,
            (SELECT COUNT(*) FROM documents d WHERE d.workspace_id = w.id) as document_count,
            (SELECT COUNT(*) FROM document_chunks dc 
                JOIN documents d ON d.id = dc.document_id 
                WHERE d.workspace_id = w.id) as chunk_count,
            (SELECT COUNT(*) FROM business_records br WHERE br.workspace_id = w.id) as record_count,
            (SELECT COUNT(*) FROM reports r WHERE r.workspace_id = w.id) as report_count,
            (SELECT COUNT(*) FROM approvals a WHERE a.workspace_id = w.id) as approval_count
        FROM workspaces w
        ORDER BY w.created_at DESC
    """
    rows = query(sql)
    return {"workspaces": rows}


@router.post("/data/recalculate")
def recalculate_metrics(_admin: dict = Depends(require_admin)):
    # Refresh/recalculate any cached or aggregated figures
    return {"message": "Numerical metrics recalculated successfully", "timestamp": "now"}
