from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..middleware.auth import get_current_user
from ..services.business_tools import business_tools_service

router = APIRouter(prefix="/api/tools", tags=["tools"])

AVAILABLE_TOOLS = [
    {
        "name": "sales_totals",
        "description": "Calculate total sales, transaction counts, and averages across business records.",
        "parameters": {
            "amountField": "string (default: 'amount')",
            "dateRange": "{ startDate, endDate, dateField }",
        },
    },
    {
        "name": "top_products",
        "description": "Rank top selling products by gross revenue.",
        "parameters": {
            "productField": "string (default: 'product')",
            "amountField": "string (default: 'amount')",
            "limit": "number (default: 10)",
        },
    },
    {
        "name": "invoice_list",
        "description": "List and filter customer invoices by status or date.",
        "parameters": {
            "statusFilter": "string (e.g. 'unpaid', 'overdue')",
            "dateRange": "{ startDate, endDate }",
        },
    },
    {
        "name": "overdue_totals",
        "description": "Compute overdue invoice totals and past-due accounts.",
        "parameters": {
            "asOfDate": "string ISO date",
        },
    },
]


class RunToolRequest(BaseModel):
    tool: str
    args: Dict[str, Any] = {}


@router.get("")
def list_tools():
    return {"tools": AVAILABLE_TOOLS}


@router.post("/run")
def run_tool(body: RunToolRequest, current_user: dict = Depends(get_current_user)):
    ws_id = current_user["workspace_id"]
    tool = body.tool
    args = body.args

    if tool == "sales_totals":
        res = business_tools_service.sales_totals(
            ws_id,
            amount_field=args.get("amountField", "amount"),
            date_range=args.get("dateRange"),
        )
        return {"result": res}
    elif tool == "top_products":
        res = business_tools_service.top_products(
            ws_id,
            product_field=args.get("productField", "product"),
            amount_field=args.get("amountField", "amount"),
            limit=args.get("limit", 10),
            date_range=args.get("dateRange"),
        )
        return {"result": res}
    elif tool == "invoice_list":
        res = business_tools_service.invoice_list(
            ws_id,
            status_filter=args.get("statusFilter"),
            date_range=args.get("dateRange"),
        )
        return {"result": res}
    elif tool == "overdue_totals":
        res = business_tools_service.overdue_totals(
            ws_id,
            as_of_date=args.get("asOfDate"),
        )
        return {"result": res}
    else:
        raise HTTPException(status_code=400, detail=f"Unknown tool: {tool}")
