import { query } from "../db/connection.js";

export interface Conversation {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateConversationInput {
  workspace_id: string;
  user_id: string;
  title?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  sources: Array<{
    documentId: string;
    documentName: string;
    page?: number;
    chunkIndex?: number;
    snippet: string;
  }>;
  toolCalls: Array<{
    id: string;
    name: string;
    status: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
  }>;
  created_at: Date;
}

export interface CreateMessageInput {
  conversation_id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  sources?: Message["sources"];
  toolCalls?: Message["toolCalls"];
}

export async function createConversation(input: CreateConversationInput): Promise<Conversation> {
  const result = await query(
    `INSERT INTO conversations (workspace_id, user_id, title)
     VALUES ($1, $2, $3)
     RETURNING id, workspace_id, user_id, title, created_at, updated_at`,
    [input.workspace_id, input.user_id, input.title ?? "New Conversation"],
  );
  const rows = (result as { rows: Conversation[] }).rows;
  return rows[0];
}

export async function findConversationById(id: string): Promise<Conversation | null> {
  const result = await query(
    `SELECT id, workspace_id, user_id, title, created_at, updated_at
     FROM conversations
     WHERE id = $1`,
    [id],
  );
  const rows = (result as { rows: Conversation[] }).rows;
  return rows.length > 0 ? rows[0] : null;
}

export async function findConversationsByWorkspace(
  workspaceId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<Conversation[]> {
  const result = await query(
    `SELECT id, workspace_id, user_id, title, created_at, updated_at
     FROM conversations
     WHERE workspace_id = $1
     ORDER BY updated_at DESC
     LIMIT $2 OFFSET $3`,
    [workspaceId, limit, offset],
  );
  return (result as { rows: Conversation[] }).rows;
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  await query(`UPDATE conversations SET title = $1, updated_at = now() WHERE id = $2`, [title, id]);
}

export async function createMessage(input: CreateMessageInput): Promise<Message> {
  const result = await query(
    `INSERT INTO messages (conversation_id, role, content, sources, tool_calls)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, conversation_id, role, content, sources, tool_calls, created_at`,
    [
      input.conversation_id,
      input.role,
      input.content,
      JSON.stringify(input.sources ?? []),
      JSON.stringify(input.toolCalls ?? []),
    ],
  );
  const rows = (result as { rows: Message[] }).rows;
  return {
    ...rows[0],
    sources: rows[0].sources ?? [],
    toolCalls: rows[0].toolCalls ?? [],
  };
}

export async function findMessagesByConversation(
  conversationId: string,
  { limit = 100, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<Message[]> {
  const result = await query(
    `SELECT id, conversation_id, role, content, sources, tool_calls, created_at
     FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC
     LIMIT $2 OFFSET $3`,
    [conversationId, limit, offset],
  );
  return (result as { rows: Message[] }).rows.map((row) => ({
    ...row,
    sources: row.sources ?? [],
    toolCalls: row.toolCalls ?? [],
  }));
}

export async function deleteConversation(id: string): Promise<Conversation | null> {
  const result = await query(
    `DELETE FROM conversations
     WHERE id = $1
     RETURNING id, workspace_id, user_id, title, created_at, updated_at`,
    [id],
  );
  const rows = (result as { rows: Conversation[] }).rows;
  return rows.length > 0 ? rows[0] : null;
}
