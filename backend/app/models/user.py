import uuid
from typing import Any, Dict, List, Optional
from ..db.connection import query, execute


def create_user(
    email: str,
    password_hash: str,
    role: str = "member",
    workspace_id: Optional[str] = None,
    name: Optional[str] = None,
) -> Dict[str, Any]:
    user_id = str(uuid.uuid4())
    display_name = name.strip() if name and name.strip() else email.split("@")[0].capitalize()
    sql = """
        INSERT INTO users (id, email, password_hash, role, workspace_id, name, is_active, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, TRUE, now(), now())
        RETURNING id, email, role, workspace_id, name, is_active, created_at, updated_at
    """
    rows = query(sql, (user_id, email.lower().strip(), password_hash, role, workspace_id, display_name))
    return rows[0]


def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT id, email, password_hash, role, workspace_id, name, is_active, created_at, updated_at
        FROM users
        WHERE email = %s
    """
    rows = query(sql, (email.lower().strip(),))
    return rows[0] if rows else None


def find_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT id, email, role, workspace_id, name, is_active, created_at, updated_at
        FROM users
        WHERE id = %s
    """
    rows = query(sql, (user_id,))
    return rows[0] if rows else None


def update_user_password(user_id: str, new_password_hash: str) -> bool:
    sql = """
        UPDATE users
        SET password_hash = %s, updated_at = now()
        WHERE id = %s
    """
    return execute(sql, (new_password_hash, user_id)) > 0


def list_all_users() -> List[Dict[str, Any]]:
    sql = """
        SELECT u.id, u.email, u.role, u.workspace_id, u.name, u.is_active, u.created_at,
               w.name as workspace_name,
               (SELECT COUNT(*) FROM documents d WHERE d.workspace_id = u.workspace_id) as document_count,
               (SELECT COUNT(*) FROM conversations c WHERE c.workspace_id = u.workspace_id) as conversation_count
        FROM users u
        LEFT JOIN workspaces w ON w.id = u.workspace_id
        ORDER BY u.created_at DESC
    """
    return query(sql)


def update_user_role(user_id: str, role: str) -> bool:
    sql = """
        UPDATE users
        SET role = %s, updated_at = now()
        WHERE id = %s
    """
    return execute(sql, (role, user_id)) > 0


def toggle_user_active(user_id: str, is_active: bool) -> bool:
    sql = """
        UPDATE users
        SET is_active = %s, updated_at = now()
        WHERE id = %s
    """
    return execute(sql, (is_active, user_id)) > 0


def delete_user(user_id: str) -> bool:
    sql = "DELETE FROM users WHERE id = %s"
    return execute(sql, (user_id,)) > 0
