import uuid
from typing import Any, Dict, List, Optional
from ..db.connection import query, execute


def create_report(
    workspace_id: str,
    user_id: str,
    title: str,
    report_type: str = "summary",
    file_path: Optional[str] = None,
    status: str = "ready",
) -> Dict[str, Any]:
    report_id = str(uuid.uuid4())
    sql = """
        INSERT INTO reports (id, workspace_id, user_id, title, type, status, file_path, generated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, now())
        RETURNING id, workspace_id, user_id, title, type, status, file_path, generated_at, error_message
    """
    rows = query(
        sql,
        (
            report_id,
            workspace_id,
            user_id,
            title,
            report_type,
            status,
            file_path,
        ),
    )
    return rows[0]


def list_reports(workspace_id: str) -> List[Dict[str, Any]]:
    sql = """
        SELECT id, workspace_id, user_id, title, type, status, file_path, generated_at, error_message
        FROM reports
        WHERE workspace_id = %s
        ORDER BY generated_at DESC
    """
    return query(sql, (workspace_id,))


def find_report_by_id(report_id: str) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT id, workspace_id, user_id, title, type, status, file_path, generated_at, error_message
        FROM reports
        WHERE id = %s
    """
    rows = query(sql, (report_id,))
    return rows[0] if rows else None
