export interface CsvParseResult {
  columns: string[];
  rows: string[][];
  valid: boolean;
  errors: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number[];
}

export interface CsvParseOptions {
  delimiter?: string;
  quote?: string;
  escape?: string;
  maxRows?: number;
  maxColumns?: number;
}

const DEFAULT_OPTIONS: Required<CsvParseOptions> = {
  delimiter: ",",
  quote: '"',
  escape: '"',
  maxRows: 10000,
  maxColumns: 100,
};

/**
 * Parses a CSV buffer into columns and rows with validation.
 * Handles quoted fields, embedded delimiters, and escaped quotes.
 * Returns structured result with validity flags and error details.
 * Does not mutate or write to any external system — pure parsing.
 */
export function parseCsv(buffer: Buffer, options: CsvParseOptions = {}): CsvParseResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const raw = buffer.toString("utf8");

  if (!raw || raw.trim().length === 0) {
    return {
      columns: [],
      rows: [],
      valid: false,
      errors: ["The CSV file is empty."],
      totalRows: 0,
      validRows: 0,
      invalidRows: [],
    };
  }

  const lines = splitCsvLines(raw);
  if (lines.length === 0) {
    return {
      columns: [],
      rows: [],
      valid: false,
      errors: ["The CSV file contains no data."],
      totalRows: 0,
      validRows: 0,
      invalidRows: [],
    };
  }

  // Parse header row
  const headerFields = parseCsvLine(lines[0], opts);
  const columns: string[] = headerFields.map((f) => f.trim()).filter(Boolean);

  if (columns.length === 0) {
    return {
      columns: [],
      rows: [],
      valid: false,
      errors: ["The CSV file has no valid header row."],
      totalRows: 0,
      validRows: 0,
      invalidRows: [],
    };
  }

  if (columns.length > opts.maxColumns) {
    return {
      columns,
      rows: [],
      valid: false,
      errors: [`Too many columns (${columns.length}); maximum is ${opts.maxColumns}.`],
      totalRows: 0,
      validRows: 0,
      invalidRows: [],
    };
  }

  // Parse data rows
  const rows: string[][] = [];
  const invalidRows: number[] = [];
  let validRows = 0;

  for (let i = 1; i < lines.length; i++) {
    if (rows.length >= opts.maxRows) {
      invalidRows.push(i);
      continue;
    }

    const line = lines[i].trim();
    if (line.length === 0) {
      // Skip blank lines
      continue;
    }

    const fields = parseCsvLine(line, opts);

    if (fields.length !== columns.length) {
      invalidRows.push(i);
      continue;
    }

    // Check for blank cells in required fields
    const hasBlank = fields.some((cell) => cell.trim() === "");
    if (hasBlank) {
      invalidRows.push(i);
      continue;
    }

    rows.push(fields);
    validRows++;
  }

  const errors: string[] = [];
  if (invalidRows.length > 0) {
    errors.push(`${invalidRows.length} row(s) failed validation (blank cells or column mismatch).`);
  }

  return {
    columns,
    rows,
    valid: invalidRows.length === 0 && rows.length > 0,
    errors,
    totalRows: lines.length - 1,
    validRows,
    invalidRows,
  };
}

/**
 * Split raw CSV text into lines, respecting quoted fields that may contain newlines.
 */
function splitCsvLines(raw: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];

    if (ch === '"') {
      if (inQuotes && i + 1 < raw.length && raw[i + 1] === '"') {
        current += '""';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      current += ch;
      i++;
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && i + 1 < raw.length && raw[i + 1] === "\n") {
        i++; // skip \n after \r
      }
      lines.push(current);
      current = "";
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  if (current.trim().length > 0) {
    lines.push(current);
  }

  return lines;
}

/**
 * Parse a single CSV line into fields, respecting quotes and escapes.
 */
function parseCsvLine(line: string, opts: Required<CsvParseOptions>): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (ch === opts.quote) {
      if (inQuotes && i + 1 < line.length && line[i + 1] === opts.quote) {
        current += opts.quote;
        i += 2;
        continue;
      }
      if (!inQuotes) {
        inQuotes = true;
        i++;
        continue;
      }
      inQuotes = false;
      i++;
      continue;
    }

    if (ch === opts.delimiter && !inQuotes) {
      fields.push(current);
      current = "";
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  fields.push(current);
  return fields;
}
