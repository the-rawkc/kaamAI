import json
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from ..db.connection import query, execute
from ..middleware.auth import get_current_user
from ..services.csv_parser import parse_csv

router = APIRouter(prefix="/api/imports", tags=["imports"])


class CreateJobRequest(BaseModel):
    file_name: str
    total_rows: int


class ConfirmImportRequest(BaseModel):
    job_id: str
    rows: List[Dict[str, Any]]


@router.post("/preview")
async def preview_csv(file: UploadFile = File(...)):
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_ENCODING", "message": "File is not valid UTF-8."}},
        )

    try:
        parsed = parse_csv(text, max_rows=50)
        return {
            "headers": parsed["headers"],
            "previewRows": parsed["rows"],
            "totalRows": parsed["rowCount"],
        }
    except Exception as err:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "CSV_PARSE_ERROR", "message": str(err)}},
        )


@router.get("/jobs")
def list_import_jobs(current_user: dict = Depends(get_current_user)):
    sql = """
        SELECT id, workspace_id, user_id, file_name, status, total_rows, imported_rows, error_rows, created_at, updated_at
        FROM import_jobs
        WHERE workspace_id = %s
        ORDER BY created_at DESC
    """
    jobs = query(sql, (current_user["workspace_id"],))
    return {"jobs": jobs}


@router.post("/jobs")
def create_import_job(
    body: CreateJobRequest, current_user: dict = Depends(get_current_user)
):
    job_id = str(uuid.uuid4())
    sql = """
        INSERT INTO import_jobs (id, workspace_id, user_id, file_name, status, total_rows, created_at, updated_at)
        VALUES (%s, %s, %s, %s, 'pending', %s, now(), now())
        RETURNING id, workspace_id, user_id, file_name, status, total_rows, imported_rows, error_rows, created_at, updated_at
    """
    rows = query(
        sql,
        (
            job_id,
            current_user["workspace_id"],
            current_user["id"],
            body.file_name,
            body.total_rows,
        ),
    )
    return {"job": rows[0]}


@router.post("/confirm")
def confirm_import(
    body: ConfirmImportRequest, current_user: dict = Depends(get_current_user)
):
    jobs = query(
        "SELECT id, workspace_id FROM import_jobs WHERE id = %s",
        (body.job_id,),
    )
    if not jobs or str(jobs[0]["workspace_id"]) != current_user["workspace_id"]:
        raise HTTPException(status_code=404, detail="Import job not found.")

    workspace_id = current_user["workspace_id"]
    imported_count = 0

    for idx, row_dict in enumerate(body.rows, 1):
        rec_id = str(uuid.uuid4())
        sql = """
            INSERT INTO business_records (id, workspace_id, import_job_id, record_data, source_row, created_at)
            VALUES (%s, %s, %s, %s::jsonb, %s, now())
        """
        execute(sql, (rec_id, workspace_id, body.job_id, json.dumps(row_dict), idx))
        imported_count += 1

    execute(
        """
        UPDATE import_jobs
        SET status = 'completed', imported_rows = %s, updated_at = now(), completed_at = now()
        WHERE id = %s
        """,
        (imported_count, body.job_id),
    )

    return {
        "status": "completed",
        "importedRows": imported_count,
    }


@router.delete("/jobs/{job_id}")
def delete_import_job(job_id: str, current_user: dict = Depends(get_current_user)):
    jobs = query(
        "SELECT id, workspace_id FROM import_jobs WHERE id = %s",
        (job_id,),
    )
    if not jobs or str(jobs[0]["workspace_id"]) != current_user["workspace_id"]:
        raise HTTPException(status_code=404, detail="Import job not found.")

    execute("DELETE FROM business_records WHERE import_job_id = %s", (job_id,))
    execute("DELETE FROM import_jobs WHERE id = %s", (job_id,))
    return {"message": "Job deleted"}
