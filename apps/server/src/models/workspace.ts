import { query } from "../db/connection.js";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: Date;
}

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  const result = await query(
    `INSERT INTO workspaces (name, slug)
     VALUES ($1, $2)
     RETURNING id, name, slug, created_at`,
    [input.name, input.slug],
  );
  const rows = (result as { rows: Workspace[] }).rows;
  return rows[0];
}

export async function findWorkspaceById(id: string): Promise<Workspace | null> {
  const result = await query(`SELECT id, name, slug, created_at FROM workspaces WHERE id = $1`, [
    id,
  ]);
  const rows = (result as { rows: Workspace[] }).rows;
  return rows.length > 0 ? rows[0] : null;
}

export async function findWorkspaceBySlug(slug: string): Promise<Workspace | null> {
  const result = await query(`SELECT id, name, slug, created_at FROM workspaces WHERE slug = $1`, [
    slug,
  ]);
  const rows = (result as { rows: Workspace[] }).rows;
  return rows.length > 0 ? rows[0] : null;
}

export async function ensureDefaultWorkspace(): Promise<Workspace> {
  const existing = await findWorkspaceBySlug("default");
  if (existing) {
    return existing;
  }
  return createWorkspace({ name: "Default Workspace", slug: "default" });
}
