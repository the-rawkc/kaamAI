import uuid
from typing import Any, Dict, Optional
from ..db.connection import query, execute


def create_user(
    email: str,
    password_hash: str,
    role: str = "member",
    workspace_id: Optional[str] = None,
) -> Dict[str, Any]:
    user_id = str(uuid.uuid4())
    sql = """
        INSERT INTO users (id, email, password_hash, role, workspace_id, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, now(), now())
        RETURNING id, email, role, workspace_id, created_at, updated_at
    """
    rows = query(sql, (user_id, email.lower().strip(), password_hash, role, workspace_id))
    return rows[0]


def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT id, email, password_hash, role, workspace_id, created_at, updated_at
        FROM users
        WHERE email = %s
    """
    rows = query(sql, (email.lower().strip(),))
    return rows[0] if rows else None


def find_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT id, email, role, workspace_id, created_at, updated_at
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
