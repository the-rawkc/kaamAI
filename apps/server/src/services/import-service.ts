import { parseCsv } from "./csv-parser.js";
import { query } from "../db/connection.js";

export interface ImportJob {
  id: string;
  workspace_id: string;
  user_id: string;
  file_name: string;
  status: "pending" | "mapping" | "validating" | "importing" | "completed" | "error";
  total_rows: number;
  imported_rows: number;
  error_rows: number;
  created_at: Date;
  completed_at: Date | null;
}

export interface ImportPreview {
  columns: string[];
  rows: string[][];
  valid: boolean;
  errors: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number[];
}

export interface ImportMapping {
  [sourceColumn: string]: string;
}

export interface ImportRecord {
  [fieldName: string]: string | number | boolean | null;
}

export interface ImportResult {
  jobId: string;
  importedRows: number;
  errorRows: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

/**
 * Import service for structured business data (CSV imports).
 *
 * Enforces the SRS requirement: no write before explicit confirmation.
 * The flow is:
 *   1. Preview (parse CSV, validate structure) — no persistence
 *   2. Mapping (user maps source columns to target fields) — no persistence
 *   3. Validate (check each row against field rules) — no persistence
 *   4. Confirm (explicit user action) — writes records to database
 */
export class ImportService {
  /**
   * Preview a CSV file without persisting anything. Returns columns, rows,
   * and validation results so the user can review before mapping.
   */
  previewCsv(buffer: Buffer): ImportPreview {
    return parseCsv(buffer);
  }

  /**
   * Create a pending import job record. Called after the user has reviewed
   * the preview and chosen to proceed to mapping/confirmation.
   */
  async createJob(
    workspaceId: string,
    userId: string,
    fileName: string,
    preview: ImportPreview,
  ): Promise<ImportJob> {
    const result = await query(
      `INSERT INTO import_jobs (workspace_id, user_id, file_name, status, total_rows, imported_rows, error_rows)
       VALUES ($1, $2, $3, 'pending', $4, 0, 0)
       RETURNING id, workspace_id, user_id, file_name, status, total_rows, imported_rows, error_rows, created_at, completed_at`,
      [workspaceId, userId, fileName, preview.totalRows],
    );
    const rows = (result as { rows: ImportJob[] }).rows;
    return rows[0];
  }

  /**
   * Update an import job's status and progress counters.
   */
  async updateJob(
    jobId: string,
    updates: Partial<Pick<ImportJob, "status" | "imported_rows" | "error_rows" | "completed_at">>,
  ): Promise<void> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${paramIndex++}`);
      params.push(value);
    }

    if (setClauses.length === 0) return;

    params.push(jobId);

    await query(
      `UPDATE import_jobs SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`,
      params,
    );
  }

  /**
   * Validate mapped rows against field rules before confirmation.
   * Returns validation errors per row; does not persist anything.
   */
  validateMappedRows(
    rows: ImportRecord[],
    mapping: ImportMapping,
    requiredFields: string[] = [],
  ): { valid: boolean; errors: Array<{ row: number; field: string; message: string }> } {
    const errors: Array<{ row: number; field: string; message: string }> = [];

    rows.forEach((record, rowIndex) => {
      for (const field of requiredFields) {
        const value = record[field];
        if (value === undefined || value === null || value === "") {
          errors.push({
            row: rowIndex + 1,
            field,
            message: `Required field "${field}" is missing or empty.`,
          });
        }
      }

      for (const [sourceCol, targetField] of Object.entries(mapping)) {
        const value = record[sourceCol];
        if (value !== undefined && value !== null && value !== "") {
          if (
            targetField.toLowerCase().includes("amount") ||
            targetField.toLowerCase().includes("price") ||
            targetField.toLowerCase().includes("total") ||
            targetField.toLowerCase().includes("count")
          ) {
            const num = Number(value);
            if (Number.isNaN(num)) {
              errors.push({
                row: rowIndex + 1,
                field: targetField,
                message: `Expected a number for "${targetField}" but got "${value}".`,
              });
            }
          }
        }
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Confirm and persist an import. This is the only write step — nothing is
   * persisted before this explicit confirmation.
   * Creates business_records from mapped rows.
   */
  async confirmImport(
    jobId: string,
    mapping: ImportMapping,
    rows: ImportRecord[],
    userId: string,
  ): Promise<ImportResult> {
    const jobResult = await query(
      `SELECT id, workspace_id, status FROM import_jobs WHERE id = $1`,
      [jobId],
    );
    const jobRows = (
      jobResult as { rows: Array<{ id: string; workspace_id: string; status: string }> }
    ).rows;
    if (jobRows.length === 0) {
      throw new Error(`Import job ${jobId} not found.`);
    }
    const job = jobRows[0];
    if (job.status !== "pending" && job.status !== "mapping" && job.status !== "validating") {
      throw new Error(`Import job ${jobId} is already in status "${job.status}".`);
    }

    const errors: Array<{ row: number; field: string; message: string }> = [];
    let importedRows = 0;

    await query("BEGIN");
    try {
      await query(`UPDATE import_jobs SET status = 'importing' WHERE id = $1`, [jobId]);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const record: ImportRecord = {};

        for (const [sourceCol, targetField] of Object.entries(mapping)) {
          record[targetField] = row[sourceCol] ?? null;
        }

        record["_import_job_id"] = jobId;
        record["_imported_at"] = new Date().toISOString();
        record["_imported_by"] = userId;

        try {
          await query(
            `INSERT INTO business_records (workspace_id, import_job_id, record_data, source_row)
             VALUES ($1, $2, $3, $4)`,
            [job.workspace_id, jobId, JSON.stringify(record), i + 1],
          );
          importedRows++;
        } catch (err) {
          errors.push({
            row: i + 1,
            field: "record",
            message: err instanceof Error ? err.message : "Failed to insert record.",
          });
        }
      }

      const errorRows = errors.length;
      const status = errorRows > 0 && importedRows === 0 ? "error" : "completed";

      await query(
        `UPDATE import_jobs
         SET status = $1, imported_rows = $2, error_rows = $3, completed_at = now(), updated_at = now()
         WHERE id = $4`,
        [status, importedRows, errorRows, jobId],
      );

      await query("COMMIT");

      return {
        jobId,
        importedRows,
        errorRows: errors.length,
        errors,
      };
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  }

  /**
   * Get an import job by ID.
   */
  async getJob(jobId: string): Promise<ImportJob | null> {
    const result = await query(
      `SELECT id, workspace_id, user_id, file_name, status, total_rows, imported_rows, error_rows, created_at, completed_at
       FROM import_jobs WHERE id = $1`,
      [jobId],
    );
    const rows = (result as { rows: ImportJob[] }).rows;
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * List import jobs for a workspace.
   */
  async listJobs(workspaceId: string): Promise<ImportJob[]> {
    const result = await query(
      `SELECT id, workspace_id, user_id, file_name, status, total_rows, imported_rows, error_rows, created_at, completed_at
       FROM import_jobs
       WHERE workspace_id = $1
       ORDER BY created_at DESC`,
      [workspaceId],
    );
    return (result as { rows: ImportJob[] }).rows;
  }

  /**
   * Delete an import job and its associated business records.
   */
  async deleteJob(jobId: string, workspaceId: string): Promise<void> {
    await query("BEGIN");
    try {
      await query(`DELETE FROM business_records WHERE import_job_id = $1`, [jobId]);
      await query(`DELETE FROM import_jobs WHERE id = $1 AND workspace_id = $2`, [
        jobId,
        workspaceId,
      ]);
      await query("COMMIT");
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  }
}

export const importService = new ImportService();
