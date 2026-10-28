import re
from typing import Any, List

DANGEROUS_PREFIXES = ("=", "+", "-", "@", "\t", "\r")
NUMERIC_PATTERN = re.compile(r"^[-+]?\d+(\.\d+)?$")


def sanitize_csv_cell(value: Any) -> str:
    if value is None:
        return ""
    str_val = str(value)
    if not str_val:
        return ""

    trimmed = str_val.strip()
    if NUMERIC_PATTERN.match(trimmed):
        return str_val

    first_char = str_val[0]
    if first_char in DANGEROUS_PREFIXES:
        return f"'{str_val}"

    return str_val


def format_csv(headers: List[str], rows: List[List[Any]]) -> str:
    lines: List[str] = []
    lines.append(",".join(f'"{sanitize_csv_cell(h)}"' for h in headers))
    for row in rows:
        lines.append(",".join(f'"{sanitize_csv_cell(cell)}"' for cell in row))
    return "\r\n".join(lines)
