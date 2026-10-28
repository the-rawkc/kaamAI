import csv
import io
from typing import Any, Dict, List


def parse_csv(
    content: str, max_rows: int = 500
) -> Dict[str, Any]:
    if not content or not content.strip():
        raise ValueError("CSV content cannot be empty.")

    reader = csv.reader(io.StringIO(content))
    rows: List[List[str]] = []
    headers: List[str] = []

    try:
        headers = next(reader)
    except StopIteration:
        raise ValueError("CSV contains no rows.")

    headers = [h.strip() for h in headers]
    if not any(headers):
        raise ValueError("CSV headers cannot all be empty.")

    for i, row in enumerate(reader):
        if i >= max_rows:
            break
        # Pad or trim to header length
        if len(row) < len(headers):
            row = row + [""] * (len(headers) - len(row))
        elif len(row) > len(headers):
            row = row[: len(headers)]
        rows.append([cell.strip() for cell in row])

    return {
        "headers": headers,
        "rows": rows,
        "rowCount": len(rows),
    }
