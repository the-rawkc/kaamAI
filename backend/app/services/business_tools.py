from datetime import datetime
from typing import Any, Dict, List, Optional
from ..db.connection import query


class BusinessToolsService:
    def get_workspace_records(self, workspace_id: str) -> List[Dict[str, Any]]:
        sql = """
            SELECT id, workspace_id, import_job_id, record_data, source_row, created_at
            FROM business_records
            WHERE workspace_id = %s
            ORDER BY created_at ASC
        """
        return query(sql, (workspace_id,))

    def extract_number(self, record_data: Dict[str, Any], field: str) -> Optional[float]:
        val = record_data.get(field)
        if val is None or val == "":
            return None
        if isinstance(val, (int, float)):
            return float(val)
        if isinstance(val, str):
            cleaned = val.replace("$", "").replace(",", "").strip()
            try:
                return float(cleaned)
            except ValueError:
                return None
        return None

    def extract_string(self, record_data: Dict[str, Any], field: str) -> Optional[str]:
        val = record_data.get(field)
        if val is None or val == "":
            return None
        return str(val)

    def parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        if not date_str:
            return None
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y/%m/%d", "%m/%d/%Y"):
            try:
                return datetime.strptime(date_str[:19], fmt)
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(date_str)
        except Exception:
            return None

    def filter_by_date_range(
        self, records: List[Dict[str, Any]], date_range: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        start_str = date_range.get("startDate")
        end_str = date_range.get("endDate")
        if not start_str and not end_str:
            return records

        start = self.parse_date(start_str) if start_str else None
        end = self.parse_date(end_str) if end_str else None
        date_field = date_range.get("dateField", "date")

        filtered = []
        for r in records:
            data = r.get("record_data", {})
            d_str = self.extract_string(data, date_field)
            rec_date = self.parse_date(d_str)
            if not rec_date:
                continue
            if start and rec_date < start:
                continue
            if end and rec_date > end:
                continue
            filtered.append(r)
        return filtered

    def sales_totals(
        self,
        workspace_id: str,
        amount_field: str = "amount",
        date_range: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        records = self.get_workspace_records(workspace_id)
        filtered = self.filter_by_date_range(records, date_range or {})

        total_sales = 0.0
        transaction_count = 0
        currency = None

        for r in filtered:
            data = r.get("record_data", {})
            amt = self.extract_number(data, amount_field)
            if amt is not None:
                total_sales += amt
                transaction_count += 1
            cur = self.extract_string(data, "currency")
            if cur and not currency:
                currency = cur

        avg = (total_sales / transaction_count) if transaction_count > 0 else 0.0
        return {
            "totalSales": round(total_sales, 2),
            "transactionCount": transaction_count,
            "averageSale": round(avg, 2),
            "currency": currency,
        }

    def top_products(
        self,
        workspace_id: str,
        product_field: str = "product",
        amount_field: str = "amount",
        date_range: Optional[Dict[str, Any]] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        records = self.get_workspace_records(workspace_id)
        filtered = self.filter_by_date_range(records, date_range or {})

        product_map: Dict[str, Dict[str, Any]] = {}
        for r in filtered:
            data = r.get("record_data", {})
            product = self.extract_string(data, product_field)
            amt = self.extract_number(data, amount_field)
            if not product or amt is None:
                continue

            if product not in product_map:
                product_map[product] = {"totalSales": 0.0, "count": 0}
            product_map[product]["totalSales"] += amt
            product_map[product]["count"] += 1

        items = [
            {
                "product": prod,
                "totalSales": round(info["totalSales"], 2),
                "transactionCount": info["count"],
            }
            for prod, info in product_map.items()
        ]
        items.sort(key=lambda x: x["totalSales"], reverse=True)
        return items[:limit]

    def invoice_list(
        self,
        workspace_id: str,
        invoice_field: str = "invoice_number",
        customer_field: str = "customer",
        amount_field: str = "amount",
        date_field: str = "date",
        status_field: str = "status",
        due_date_field: str = "due_date",
        status_filter: Optional[str] = None,
        date_range: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        records = self.get_workspace_records(workspace_id)
        filtered = self.filter_by_date_range(records, date_range or {"dateField": date_field})

        invoices = []
        for r in filtered:
            data = r.get("record_data", {})
            status = self.extract_string(data, status_field)
            if status_filter and status != status_filter:
                continue

            amt = self.extract_number(data, amount_field) or 0.0
            invoices.append(
                {
                    "id": str(r.get("id")),
                    "invoiceNumber": self.extract_string(data, invoice_field),
                    "customer": self.extract_string(data, customer_field),
                    "amount": amt,
                    "date": self.extract_string(data, date_field),
                    "dueDate": self.extract_string(data, due_date_field),
                    "status": status,
                }
            )
        return invoices

    def overdue_totals(
        self,
        workspace_id: str,
        amount_field: str = "amount",
        due_date_field: str = "due_date",
        status_field: str = "status",
        as_of_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        records = self.get_workspace_records(workspace_id)
        ref_date = self.parse_date(as_of_date) if as_of_date else datetime.now()
        if not ref_date:
            raise ValueError(f"Invalid as_of_date: {as_of_date}")

        paid_statuses = {"paid", "closed", "settled", "complete"}
        overdue_invoices = []
        overdue_total = 0.0

        for r in records:
            data = r.get("record_data", {})
            status = (self.extract_string(data, status_field) or "").lower()
            if status in paid_statuses:
                continue

            due_str = self.extract_string(data, due_date_field)
            due_date = self.parse_date(due_str)
            if not due_date or due_date >= ref_date:
                continue

            amt = self.extract_number(data, amount_field) or 0.0
            overdue_total += amt
            overdue_invoices.append(
                {
                    "id": str(r.get("id")),
                    "invoiceNumber": self.extract_string(data, "invoice_number"),
                    "customer": self.extract_string(data, "customer"),
                    "amount": amt,
                    "date": self.extract_string(data, "date"),
                    "dueDate": due_str,
                    "status": status,
                }
            )

        return {
            "overdueCount": len(overdue_invoices),
            "overdueTotal": round(overdue_total, 2),
            "overdueInvoices": overdue_invoices,
        }


business_tools_service = BusinessToolsService()
