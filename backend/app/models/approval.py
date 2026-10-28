import json
import uuid
from typing import Any, Dict, List, Optional
from ..db.connection import query, execute


def create_approval(
    workspace_id: str,
    user_id: str,
    action: str,
    description: str,
    data: Optional[Dict[str, Any]] = None,
    consequences: Optional[List[str]] = None,
) -> Dict[str, Any]:
    appr_id = str(uuid.uuid4())
    sql = """
        INSERT INTO approvals (id, workspace_id, user_id, action, description, data, consequences, status, created_at)
        VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, 'pending', now())
        RETURNING id, workspace_id, user_id, action, description, data, consequences, status, created_at, resolved_at, resolved_by
    """
    rows = query(
        sql,
        (
            appr_id,
            workspace_id,
            user_id,
            action,
            description,
            json.dumps(data or {}),
            json.dumps(consequences or []),
        ),
    )
    return rows[0]


def list_approvals(workspace_id: str) -> List[Dict[str, Any]]:
    sql = """
        SELECT id, workspace_id, user_id, action, description, data, consequences, status, created_at, resolved_at, resolved_by
        FROM approvals
        WHERE workspace_id = %s
        ORDER BY created_at DESC
    """
    return query(sql, (workspace_id,))


def find_approval_by_id(approval_id: str) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT id, workspace_id, user_id, action, description, data, consequences, status, created_at, resolved_at, resolved_by
        FROM approvals
        WHERE id = %s
    """
    rows = query(sql, (approval_id,))
    return rows[0] if rows else None


def update_approval_status(
    approval_id: str,
    status: str,
    resolved_by: str,
) -> Optional[Dict[str, Any]]:
    sql = """
        UPDATE approvals
        SET status = %s, resolved_by = %s, resolved_at = now()
        WHERE id = %s
        RETURNING id, workspace_id, user_id, action, description, data, consequences, status, created_at, resolved_at, resolved_by
    """
    rows = query(sql, (status, resolved_by, approval_id))
    return rows[0] if rows else None
