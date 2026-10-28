import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;
let poolError: Error | null = null;

export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    const error = new Error(
      "DATABASE_URL is not configured. Set DATABASE_URL in .env and start PostgreSQL before using database-backed routes.",
    );
    poolError = error;
    throw error;
  }

  pool = new Pool({
    connectionString: databaseUrl,
    application_name: "kaamai-api",
    connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS ?? 3000),
  });

  pool.on("error", (err) => {
    poolError = err;
    console.error("Unexpected PostgreSQL pool error:", err.message);
  });

  return pool;
}

export function getPoolError(): Error | null {
  return poolError;
}

export async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

export async function query(text: string, params?: unknown[]): Promise<unknown> {
  const result = await getPool().query(text, params);
  return result;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await getPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
