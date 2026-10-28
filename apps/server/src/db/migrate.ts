import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "./connection.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

async function getMigrationsDir(): Promise<string> {
  const localDir = join(__dirname, "migrations");
  try {
    await readdir(localDir);
    return localDir;
  } catch {
    return join(__dirname, "../../src/db/migrations");
  }
}

export async function ensureMigrationsTable(): Promise<void> {
  await query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
  );
}

export async function getAppliedMigrations(): Promise<string[]> {
  const result = await query("SELECT filename FROM schema_migrations ORDER BY filename");
  const rows = (result as { rows: { filename: string }[] }).rows;
  return rows.map((r) => r.filename);
}

export async function runPendingMigrations(): Promise<string[]> {
  await ensureMigrationsTable();
  const applied = new Set(await getAppliedMigrations());
  const migrationsDir = await getMigrationsDir();

  const files = (await getMigrationFiles(migrationsDir)).filter((f) => !applied.has(f));

  const appliedNow: string[] = [];
  for (const filename of files) {
    const sql = await readFile(join(migrationsDir, filename), "utf8");
    await query(sql);
    await query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
    appliedNow.push(filename);
  }

  return appliedNow;
}

async function getMigrationFiles(migrationsDir: string): Promise<string[]> {
  const entries = await readdir(migrationsDir);
  return entries.filter((e) => e.endsWith(".sql")).sort();
}

export async function closeDatabase(): Promise<void> {
  const { closePool } = await import("./connection.js");
  await closePool();
}
