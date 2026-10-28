import uuid
from typing import Any, Dict, Optional
from ..db.connection import query


def create_workspace(name: str, slug: Optional[str] = None) -> Dict[str, Any]:
    ws_id = str(uuid.uuid4())
    if not slug:
        slug = f"ws-{uuid.uuid4().hex[:8]}"
    sql = """
        INSERT INTO workspaces (id, name, slug, created_at, updated_at)
        VALUES (%s, %s, %s, now(), now())
        RETURNING id, name, slug, created_at, updated_at
    """
    rows = query(sql, (ws_id, name, slug))
    return rows[0]


def find_workspace_by_id(workspace_id: str) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT id, name, slug, created_at, updated_at
        FROM workspaces
        WHERE id = %s
    """
    rows = query(sql, (workspace_id,))
    return rows[0] if rows else None
