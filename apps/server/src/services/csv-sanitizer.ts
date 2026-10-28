/**
 * Neutralizes potential CSV/spreadsheet formula injection attacks.
 * Characters =, +, -, @, tab, or carriage return at the start of a cell can
 * trigger dynamic code or formula execution in Excel, Google Sheets, or LibreOffice.
 */
export function sanitizeCsvCell(cell: unknown): string {
  if (cell === null || cell === undefined) {
    return "";
  }
  const str = String(cell);
  if (/^[=+\-@\t\r]/.test(str)) {
    // Plain negative numbers (e.g. -50, -12.5) are valid arithmetic values.
    // If it's followed by formula characters, alpha letters, or commands, neutralize it.
    if (/^-\d+(\.\d+)?$/.test(str.trim())) {
      return str;
    }
    return `'${str}`;
  }
  return str;
}

export function sanitizeCsvRow(row: unknown[]): string[] {
  return row.map(sanitizeCsvCell);
}

export function escapeCsvField(field: unknown): string {
  const sanitized = sanitizeCsvCell(field);
  if (sanitized.includes(",") || sanitized.includes('"') || sanitized.includes("\n")) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export function formatCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(","));
  return [headerLine, ...dataLines].join("\n");
}
