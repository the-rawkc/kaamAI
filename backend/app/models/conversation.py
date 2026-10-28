import json
import uuid
from typing import Any, Dict, List, Optional
from ..db.connection import query, execute


def create_conversation(
    workspace_id: str, title: str = "New Conversation"
) -> Dict[str, Any]:
    conv_id = str(uuid.uuid4())
    sql = """
        INSERT INTO conversations (id, workspace_id, title, created_at, updated_at)
        VALUES (%s, %s, %s, now(), now())
        RETURNING id, workspace_id, title, created_at, updated_at
    """
    rows = query(sql, (conv_id, workspace_id, title))
    return rows[0]


def list_conversations(workspace_id: str) -> List[Dict[str, Any]]:
    sql = """
        SELECT id, workspace_id, title, created_at, updated_at
        FROM conversations
        WHERE workspace_id = %s
        ORDER BY updated_at DESC
    """
    return query(sql, (workspace_id,))


def find_conversation_by_id(conversation_id: str) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT id, workspace_id, title, created_at, updated_at
        FROM conversations
        WHERE id = %s
    """
    rows = query(sql, (conversation_id,))
    return rows[0] if rows else None


def add_message(
    conversation_id: str,
    role: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    msg_id = str(uuid.uuid4())
    meta_json = json.dumps(metadata) if metadata else None
    sql = """
        INSERT INTO messages (id, conversation_id, role, content, metadata, created_at)
        VALUES (%s, %s, %s, %s, %s, now())
        RETURNING id, conversation_id, role, content, metadata, created_at
    """
    rows = query(sql, (msg_id, conversation_id, role, content, meta_json))
    execute("UPDATE conversations SET updated_at = now() WHERE id = %s", (conversation_id,))
    return rows[0]


def get_messages(conversation_id: str) -> List[Dict[str, Any]]:
    sql = """
        SELECT id, conversation_id, role, content, metadata, created_at
        FROM messages
        WHERE conversation_id = %s
        ORDER BY created_at ASC
    """
    return query(sql, (conversation_id,))
