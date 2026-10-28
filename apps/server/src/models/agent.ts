import { query } from "../db/connection.js";

export interface AgentStep {
  step: number;
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  status: "pending" | "running" | "completed" | "error";
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface AgentRun {
  id: string;
  conversation_id: string;
  user_id: string;
  workspace_id: string;
  message: string;
  status: "pending" | "running" | "completed" | "error";
  steps: AgentStep[];
  final_answer: string | null;
  error?: string;
  created_at: Date;
  completed_at: Date | null;
}

interface AgentRunRaw {
  id: string;
  conversation_id: string;
  user_id: string;
  workspace_id: string;
  message: string;
  status: string;
  steps: unknown;
  final_answer: string | null;
  error: string | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface CreateAgentRunInput {
  conversation_id: string;
  user_id: string;
  workspace_id: string;
  message: string;
  steps: AgentStep[];
  final_answer: string | null;
  status: "pending" | "running" | "completed" | "error";
  error?: string;
}

export async function createAgentRun(input: CreateAgentRunInput): Promise<AgentRun> {
  const result = await query(
    `INSERT INTO agent_runs (conversation_id, user_id, workspace_id, message, status, steps, final_answer, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, conversation_id, user_id, workspace_id, message, status, steps, final_answer, error, created_at, completed_at`,
    [
      input.conversation_id,
      input.user_id,
      input.workspace_id,
      input.message,
      input.status,
      JSON.stringify(input.steps),
      input.final_answer,
      input.error ?? null,
    ],
  );
  const rows = (result as { rows: AgentRunRaw[] }).rows;
  return {
    ...rows[0],
    steps: typeof rows[0].steps === "string" ? JSON.parse(rows[0].steps) : (rows[0].steps ?? []),
    status: rows[0].status as AgentRun["status"],
    error: rows[0].error ?? undefined,
  };
}

export async function findAgentRunById(id: string, workspaceId?: string): Promise<AgentRun | null> {
  let sql = `SELECT id, conversation_id, user_id, workspace_id, message, status, steps, final_answer, error, created_at, completed_at
     FROM agent_runs
     WHERE id = $1`;
  const params: unknown[] = [id];
  if (workspaceId) {
    sql += ` AND workspace_id = $2`;
    params.push(workspaceId);
  }
  const result = await query(sql, params);
  const rows = (result as { rows: AgentRunRaw[] }).rows;
  if (rows.length === 0) return null;
  return {
    ...rows[0],
    steps: typeof rows[0].steps === "string" ? JSON.parse(rows[0].steps) : (rows[0].steps ?? []),
    status: rows[0].status as AgentRun["status"],
    error: rows[0].error ?? undefined,
  };
}

export async function findAgentRunsByConversation(
  conversationId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<AgentRun[]> {
  const result = await query(
    `SELECT id, conversation_id, user_id, workspace_id, message, status, steps, final_answer, error, created_at, completed_at
     FROM agent_runs
     WHERE conversation_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [conversationId, limit, offset],
  );
  const rows = (result as { rows: AgentRunRaw[] }).rows;
  return rows.map((row) => ({
    ...row,
    steps: typeof row.steps === "string" ? JSON.parse(row.steps) : (row.steps ?? []),
    status: row.status as AgentRun["status"],
    error: row.error ?? undefined,
  }));
}

export async function findAgentRunsByWorkspace(
  workspaceId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<AgentRun[]> {
  const result = await query(
    `SELECT id, conversation_id, user_id, workspace_id, message, status, steps, final_answer, error, created_at, completed_at
     FROM agent_runs
     WHERE workspace_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [workspaceId, limit, offset],
  );
  const rows = (result as { rows: AgentRunRaw[] }).rows;
  return rows.map((row) => ({
    ...row,
    steps: typeof row.steps === "string" ? JSON.parse(row.steps) : (row.steps ?? []),
    status: row.status as AgentRun["status"],
    error: row.error ?? undefined,
  }));
}

export async function updateAgentRunStatus(
  id: string,
  status: "pending" | "running" | "completed" | "error",
  finalAnswer: string | null = null,
  error: string | null = null,
  workspaceId?: string,
): Promise<void> {
  let sql = `UPDATE agent_runs
     SET status = $1, final_answer = $2, error = $3, completed_at = now()
     WHERE id = $4`;
  const params: unknown[] = [status, finalAnswer, error, id];
  if (workspaceId) {
    sql += ` AND workspace_id = $5`;
    params.push(workspaceId);
  }
  await query(sql, params);
}
