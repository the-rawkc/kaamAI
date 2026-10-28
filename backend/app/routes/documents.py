import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from ..models.document import (
    create_document,
    delete_document,
    find_document_by_id,
    list_documents_by_workspace,
    update_document_content,
    update_document_status,
)
from ..middleware.auth import get_current_user
from ..storage.local import generate_storage_key, save_file, read_file, delete_file
from ..services.extraction import extract_text
from ..services.embedding_service import embedding_service
from ..config import MAX_UPLOAD_MB

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_MIMES = {
    "text/plain": [".txt"],
    "text/csv": [".csv"],
    "application/csv": [".csv"],
    "application/pdf": [".pdf"],
}


def validate_file_bytes(filename: str, mime_type: str, data: bytes) -> None:
    if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"error": {"code": "FILE_TOO_LARGE", "message": f"File exceeds {MAX_UPLOAD_MB}MB limit."}},
        )

    ext = Path(filename).suffix.lower()
    if mime_type not in ALLOWED_MIMES or ext not in ALLOWED_MIMES[mime_type]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_FILE_TYPE", "message": f"Unsupported or mismatched file type: {ext} / {mime_type}"}},
        )

    if mime_type == "application/pdf":
        if not data.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "INVALID_PDF", "message": "File does not start with valid PDF magic bytes."}},
            )
    else:
        # Check text is UTF-8 decodeable and doesn't contain null bytes
        if b"\x00" in data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "BINARY_CONTENT", "message": "Text file contains binary null bytes."}},
            )
        try:
            data.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "INVALID_ENCODING", "message": "File is not valid UTF-8 text."}},
            )


@router.get("")
def list_documents(current_user: dict = Depends(get_current_user)):
    docs = list_documents_by_workspace(current_user["workspace_id"])
    return {"documents": docs}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    content = await file.read()
    filename = file.filename or "upload.txt"
    content_type = file.content_type or "text/plain"

    validate_file_bytes(filename, content_type, content)

    storage_key = generate_storage_key()
    target_path = save_file(storage_key, content)

    doc = create_document(
        workspace_id=current_user["workspace_id"],
        user_id=current_user["id"],
        original_filename=filename,
        mime_type=content_type,
        file_size=len(content),
        storage_key=storage_key,
        storage_path=str(target_path),
    )

    # Automatically extract text
    try:
        ext_res = extract_text(content, content_type)
        update_document_content(str(doc["id"]), ext_res["text"])
        doc["extracted_text"] = ext_res["text"]
        doc["status"] = "extracted"
    except Exception:
        pass

    return {"document": doc}


@router.get("/{document_id}")
def get_document(document_id: str, current_user: dict = Depends(get_current_user)):
    doc = find_document_by_id(document_id)
    if not doc or str(doc["workspace_id"]) != current_user["workspace_id"]:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Document not found."}},
        )
    return {"document": doc}


@router.get("/{document_id}/content")
def get_document_content(
    document_id: str, current_user: dict = Depends(get_current_user)
):
    doc = find_document_by_id(document_id)
    if not doc or str(doc["workspace_id"]) != current_user["workspace_id"]:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Document not found."}},
        )
    return {
        "id": str(doc["id"]),
        "name": doc["name"],
        "extracted_text": doc.get("extracted_text") or "",
        "status": doc["status"],
    }


@router.post("/{document_id}/extract")
def extract_document_endpoint(
    document_id: str, current_user: dict = Depends(get_current_user)
):
    doc = find_document_by_id(document_id)
    if not doc or str(doc["workspace_id"]) != current_user["workspace_id"]:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Document not found."}},
        )

    file_bytes = read_file(doc["storage_key"])
    extracted = extract_text(file_bytes, doc["mime_type"])
    update_document_content(document_id, extracted["text"])

    return {
        "status": "extracted",
        "extracted_text": extracted["text"],
        "page_count": extracted.get("page_count", 1),
    }


@router.post("/{document_id}/index")
async def index_document_endpoint(
    document_id: str, current_user: dict = Depends(get_current_user)
):
    doc = find_document_by_id(document_id)
    if not doc or str(doc["workspace_id"]) != current_user["workspace_id"]:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Document not found."}},
        )

    chunk_count = await embedding_service.index_document(document_id)
    return {
        "status": "indexed",
        "chunks_indexed": chunk_count,
    }


@router.post("/{document_id}/reindex")
async def reindex_document_endpoint(
    document_id: str, current_user: dict = Depends(get_current_user)
):
    return await index_document_endpoint(document_id, current_user)


@router.delete("/{document_id}")
def delete_document_endpoint(
    document_id: str, current_user: dict = Depends(get_current_user)
):
    doc = find_document_by_id(document_id)
    if not doc or str(doc["workspace_id"]) != current_user["workspace_id"]:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Document not found."}},
        )

    delete_file(doc["storage_key"])
    delete_document(document_id)
    return {"message": "Document deleted successfully"}
