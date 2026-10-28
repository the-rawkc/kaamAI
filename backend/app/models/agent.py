import json
import uuid
from typing import Any, Dict, List, Optional
from ..db.connection import query, execute


def create_agent_run(
    conversation_id: str,
    user_id: str,
    workspace_id: str,
    message: str,
) -> Dict[str, Any]:
    run_id = str(uuid.uuid4())
    sql = """
        INSERT INTO agent_runs (id, conversation_id, user_id, workspace_id, message, status, steps, created_at)
        VALUES (%s, %s, %s, %s, %s, 'running', '[]'::jsonb, now())
        RETURNING id, conversation_id, user_id, workspace_id, message, status, steps, final_answer, error, created_at, completed_at
    """
    rows = query(sql, (run_id, conversation_id, user_id, workspace_id, message))
    return rows[0]


def find_agent_run_by_id(run_id: str) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT id, conversation_id, user_id, workspace_id, message, status, steps, final_answer, error, created_at, completed_at
        FROM agent_runs
        WHERE id = %s
    """
    rows = query(sql, (run_id,))
    return rows[0] if rows else None


def list_agent_runs(workspace_id: str) -> List[Dict[str, Any]]:
    sql = """
        SELECT id, conversation_id, user_id, workspace_id, message, status, steps, final_answer, error, created_at, completed_at
        FROM agent_runs
        WHERE workspace_id = %s
        ORDER BY created_at DESC
    """
    return query(sql, (workspace_id,))


def update_agent_run(
    run_id: str,
    status: str,
    steps: List[Dict[str, Any]],
    final_answer: Optional[str] = None,
    error: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    sql = """
        UPDATE agent_runs
        SET status = %s, steps = %s::jsonb, final_answer = %s, error = %s, completed_at = now()
        WHERE id = %s
        RETURNING id, conversation_id, user_id, workspace_id, message, status, steps, final_answer, error, created_at, completed_at
    """
    rows = query(sql, (status, json.dumps(steps), final_answer, error, run_id))
    return rows[0] if rows else None
