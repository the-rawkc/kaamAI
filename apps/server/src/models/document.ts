import { query } from "../db/connection.js";
import { storagePathFor } from "../storage/index.js";

export type DocumentStatus = "uploaded" | "processing" | "completed" | "failed";

export interface Document {
  id: string;
  workspace_id: string;
  user_id: string;
  original_filename: string;
  storage_key: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  status: DocumentStatus;
  error_message: string | null;
  extracted_text: string | null;
  page_count: number | null;
  extracted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDocumentInput {
  workspace_id: string;
  user_id: string;
  original_filename: string;
  storage_key: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
}

export async function createDocument(input: CreateDocumentInput): Promise<Document> {
  const result = await query(
    `INSERT INTO documents (workspace_id, user_id, original_filename, storage_key, storage_path, mime_type, file_size, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'uploaded')
     RETURNING id, workspace_id, user_id, original_filename, storage_key, storage_path, mime_type, file_size, status, error_message, extracted_text, page_count, extracted_at, created_at, updated_at`,
    [
      input.workspace_id,
      input.user_id,
      input.original_filename,
      input.storage_key,
      input.storage_path,
      input.mime_type,
      input.file_size,
    ],
  );
  const rows = (result as { rows: Document[] }).rows;
  return rows[0];
}

export async function findDocumentById(id: string): Promise<Document | null> {
  const result = await query(
    `SELECT id, workspace_id, user_id, original_filename, storage_key, storage_path, mime_type, file_size, status, error_message, extracted_text, page_count, extracted_at, created_at, updated_at
     FROM documents
     WHERE id = $1`,
    [id],
  );
  const rows = (result as { rows: Document[] }).rows;
  return rows.length > 0 ? rows[0] : null;
}

export async function findDocumentByStorageKey(storageKey: string): Promise<Document | null> {
  const result = await query(
    `SELECT id, workspace_id, user_id, original_filename, storage_key, storage_path, mime_type, file_size, status, error_message, extracted_text, page_count, extracted_at, created_at, updated_at
     FROM documents
     WHERE storage_key = $1`,
    [storageKey],
  );
  const rows = (result as { rows: Document[] }).rows;
  return rows.length > 0 ? rows[0] : null;
}

export async function findDocumentsByWorkspace(
  workspaceId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<Document[]> {
  const result = await query(
    `SELECT id, workspace_id, user_id, original_filename, storage_key, storage_path, mime_type, file_size, status, error_message, extracted_text, page_count, extracted_at, created_at, updated_at
     FROM documents
     WHERE workspace_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [workspaceId, limit, offset],
  );
  return (result as { rows: Document[] }).rows;
}

export async function findDocumentsByUser(
  userId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<Document[]> {
  const result = await query(
    `SELECT id, workspace_id, user_id, original_filename, storage_key, storage_path, mime_type, file_size, status, error_message, extracted_text, page_count, extracted_at, created_at, updated_at
     FROM documents
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return (result as { rows: Document[] }).rows;
}

export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus,
  errorMessage: string | null = null,
): Promise<void> {
  await query(
    `UPDATE documents SET status = $1, error_message = $2, updated_at = now() WHERE id = $3`,
    [status, errorMessage, id],
  );
}

export async function updateDocumentContent(
  id: string,
  extractedText: string | null,
  pageCount: number | null,
): Promise<void> {
  await query(
    `UPDATE documents
     SET extracted_text = $1, page_count = $2, extracted_at = now(), updated_at = now()
     WHERE id = $3`,
    [extractedText, pageCount, id],
  );
}

export async function deleteDocument(id: string): Promise<Document | null> {
  const result = await query(
    `DELETE FROM documents
     WHERE id = $1
     RETURNING id, workspace_id, user_id, original_filename, storage_key, storage_path, mime_type, file_size, status, error_message, extracted_text, page_count, extracted_at, created_at, updated_at`,
    [id],
  );
  const rows = (result as { rows: Document[] }).rows;
  return rows.length > 0 ? rows[0] : null;
}

export async function countDocumentsByWorkspace(workspaceId: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*)::text AS count FROM documents WHERE workspace_id = $1`,
    [workspaceId],
  );
  return parseInt((result as { rows: { count: string }[] }).rows[0].count, 10);
}

export async function totalFileSizeByWorkspace(workspaceId: string): Promise<number> {
  const result = await query(
    `SELECT COALESCE(SUM(file_size), 0)::text AS total FROM documents WHERE workspace_id = $1`,
    [workspaceId],
  );
  return parseInt((result as { rows: { total: string }[] }).rows[0].total, 10);
}

export function documentStoragePath(document: Document): string {
  return storagePathFor(document.storage_key);
}
