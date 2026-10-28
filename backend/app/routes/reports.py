from fastapi import APIRouter, Depends, HTTPException, Response
from ..middleware.auth import get_current_user
from ..models.report import find_report_by_id, list_reports

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("")
def get_reports(current_user: dict = Depends(get_current_user)):
    reports = list_reports(current_user["workspace_id"])
    return {"reports": reports}


@router.get("/{report_id}/download")
def download_report(report_id: str, current_user: dict = Depends(get_current_user)):
    report = find_report_by_id(report_id)
    if not report or str(report["workspace_id"]) != current_user["workspace_id"]:
        raise HTTPException(status_code=404, detail="Report not found.")

    filename = f"{report.get('title', 'report').replace(' ', '_')}.txt"
    content = f"Report: {report.get('title')}\nType: {report.get('type')}\nStatus: {report.get('status')}"
    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
