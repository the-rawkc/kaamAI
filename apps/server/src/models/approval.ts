import { query } from "../db/connection.js";

export interface Approval {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  description: string;
  data: Record<string, unknown>;
  consequences: string[];
  status: "pending" | "approved" | "rejected";
  created_at: Date;
  resolved_at: Date | null;
  resolved_by: string | null;
}

export interface CreateApprovalInput {
  workspace_id: string;
  user_id: string;
  action: string;
  description: string;
  data?: Record<string, unknown>;
  consequences?: string[];
}

export async function createApproval(input: CreateApprovalInput): Promise<Approval> {
  const result = await query(
    `INSERT INTO approvals (workspace_id, user_id, action, description, data, consequences)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, workspace_id, user_id, action, description, data, consequences, status, created_at, resolved_at, resolved_by`,
    [
      input.workspace_id,
      input.user_id,
      input.action,
      input.description,
      JSON.stringify(input.data ?? {}),
      JSON.stringify(input.consequences ?? []),
    ],
  );
  const rows = (result as { rows: Approval[] }).rows;
  return {
    ...rows[0],
    data: typeof rows[0].data === "object" ? rows[0].data : {},
    consequences: Array.isArray(rows[0].consequences) ? rows[0].consequences : [],
  };
}

export async function findApprovalById(id: string): Promise<Approval | null> {
  const result = await query(
    `SELECT id, workspace_id, user_id, action, description, data, consequences, status, created_at, resolved_at, resolved_by
     FROM approvals
     WHERE id = $1`,
    [id],
  );
  const rows = (result as { rows: Approval[] }).rows;
  if (rows.length === 0) return null;
  return {
    ...rows[0],
    data: typeof rows[0].data === "object" ? rows[0].data : {},
    consequences: Array.isArray(rows[0].consequences) ? rows[0].consequences : [],
  };
}

export async function findApprovalsByWorkspace(
  workspaceId: string,
  { status, limit = 50, offset = 0 }: { status?: string; limit?: number; offset?: number } = {},
): Promise<Approval[]> {
  let sql = `SELECT id, workspace_id, user_id, action, description, data, consequences, status, created_at, resolved_at, resolved_by
             FROM approvals
             WHERE workspace_id = $1`;
  const params: unknown[] = [workspaceId];
  let paramIndex = 2;

  if (status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(status);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);
  return (result as { rows: Approval[] }).rows.map((row) => ({
    ...row,
    data: typeof row.data === "object" ? row.data : {},
    consequences: Array.isArray(row.consequences) ? row.consequences : [],
  }));
}

export async function resolveApproval(
  id: string,
  status: "approved" | "rejected",
  resolvedBy: string,
): Promise<Approval | null> {
  const result = await query(
    `UPDATE approvals
     SET status = $1, resolved_at = now(), resolved_by = $2
     WHERE id = $3 AND status = 'pending'
     RETURNING id, workspace_id, user_id, action, description, data, consequences, status, created_at, resolved_at, resolved_by`,
    [status, resolvedBy, id],
  );
  const rows = (result as { rows: Approval[] }).rows;
  if (rows.length === 0) return null;
  return {
    ...rows[0],
    data: typeof rows[0].data === "object" ? rows[0].data : {},
    consequences: Array.isArray(rows[0].consequences) ? rows[0].consequences : [],
  };
}

export async function deleteApproval(id: string, workspaceId: string): Promise<void> {
  await query(`DELETE FROM approvals WHERE id = $1 AND workspace_id = $2`, [id, workspaceId]);
}
