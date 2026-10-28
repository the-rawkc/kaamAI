import uuid
from typing import Any, Dict, List, Optional
from ..db.connection import query, execute


def create_document(
    workspace_id: str,
    user_id: str,
    original_filename: str,
    mime_type: str,
    file_size: int,
    storage_key: str,
    storage_path: str = "",
) -> Dict[str, Any]:
    doc_id = str(uuid.uuid4())
    sql = """
        INSERT INTO documents (id, workspace_id, user_id, original_filename, storage_key, storage_path, mime_type, file_size, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'uploaded', now(), now())
        RETURNING id, workspace_id, user_id, original_filename, storage_key, storage_path, mime_type, file_size, status, extracted_text, created_at, updated_at
    """
    rows = query(
        sql,
        (
            doc_id,
            workspace_id,
            user_id,
            original_filename,
            storage_key,
            storage_path,
            mime_type,
            file_size,
        ),
    )
    doc = rows[0]
    doc["name"] = doc["original_filename"]
    return doc


def find_document_by_id(document_id: str) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT id, workspace_id, user_id, original_filename, storage_key, storage_path, mime_type, file_size, status, extracted_text, created_at, updated_at
        FROM documents
        WHERE id = %s
    """
    rows = query(sql, (document_id,))
    if not rows:
        return None
    doc = rows[0]
    doc["name"] = doc["original_filename"]
    return doc


def list_documents_by_workspace(workspace_id: str) -> List[Dict[str, Any]]:
    sql = """
        SELECT id, workspace_id, user_id, original_filename, storage_key, storage_path, mime_type, file_size, status, extracted_text, created_at, updated_at
        FROM documents
        WHERE workspace_id = %s
        ORDER BY created_at DESC
    """
    rows = query(sql, (workspace_id,))
    for d in rows:
        d["name"] = d["original_filename"]
    return rows


def update_document_content(
    document_id: str, extracted_text: str, status: str = "extracted"
) -> bool:
    sql = """
        UPDATE documents
        SET extracted_text = %s, status = %s, updated_at = now()
        WHERE id = %s
    """
    return execute(sql, (extracted_text, status, document_id)) > 0


def update_document_status(document_id: str, status: str) -> bool:
    sql = """
        UPDATE documents
        SET status = %s, updated_at = now()
        WHERE id = %s
    """
    return execute(sql, (status, document_id)) > 0


def delete_document(document_id: str) -> bool:
    sql = "DELETE FROM documents WHERE id = %s"
    return execute(sql, (document_id,)) > 0
