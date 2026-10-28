import { query } from "../db/connection.js";

export interface Report {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  type: string;
  status: "generating" | "ready" | "error";
  file_path: string | null;
  generated_at: Date;
  error_message: string | null;
}

export interface CreateReportInput {
  workspace_id: string;
  user_id: string;
  title: string;
  type: string;
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const result = await query(
    `INSERT INTO reports (workspace_id, user_id, title, type, status)
     VALUES ($1, $2, $3, $4, 'generating')
     RETURNING id, workspace_id, user_id, title, type, status, file_path, generated_at, error_message`,
    [input.workspace_id, input.user_id, input.title, input.type],
  );
  const rows = (result as { rows: Report[] }).rows;
  return rows[0];
}

export async function findReportById(id: string): Promise<Report | null> {
  const result = await query(
    `SELECT id, workspace_id, user_id, title, type, status, file_path, generated_at, error_message
     FROM reports
     WHERE id = $1`,
    [id],
  );
  const rows = (result as { rows: Report[] }).rows;
  return rows.length > 0 ? rows[0] : null;
}

export async function findReportsByWorkspace(
  workspaceId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<Report[]> {
  const result = await query(
    `SELECT id, workspace_id, user_id, title, type, status, file_path, generated_at, error_message
     FROM reports
     WHERE workspace_id = $1
     ORDER BY generated_at DESC
     LIMIT $2 OFFSET $3`,
    [workspaceId, limit, offset],
  );
  return (result as { rows: Report[] }).rows;
}

export async function updateReportStatus(
  id: string,
  status: "generating" | "ready" | "error",
  filePath: string | null = null,
  errorMessage: string | null = null,
): Promise<void> {
  await query(
    `UPDATE reports
     SET status = $1, file_path = $2, error_message = $3
     WHERE id = $4`,
    [status, filePath, errorMessage, id],
  );
}

export async function deleteReport(id: string, workspaceId: string): Promise<void> {
  await query(`DELETE FROM reports WHERE id = $1 AND workspace_id = $2`, [id, workspaceId]);
}
