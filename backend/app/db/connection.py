import atexit
from pathlib import Path
from typing import Any, Dict, List, Optional
import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from ..config import DATABASE_URL

_pool: Optional[ConnectionPool] = None


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None or _pool.closed:
        _pool = ConnectionPool(
            conninfo=DATABASE_URL,
            min_size=2,
            max_size=20,
            timeout=10.0,
            kwargs={"row_factory": dict_row},
        )
    return _pool


def close_pool() -> None:
    global _pool
    if _pool is not None and not _pool.closed:
        try:
            _pool.close()
        except Exception:
            pass
        _pool = None


atexit.register(close_pool)


def query(sql: str, params: Optional[Any] = None) -> List[Dict[str, Any]]:
    pool = get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            if cur.description:
                return cur.fetchall()
            return []


def execute(sql: str, params: Optional[Any] = None) -> int:
    pool = get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
            return cur.rowcount


def run_migrations() -> List[str]:
    migrations_dir = Path(__file__).resolve().parent / "migrations"
    if not migrations_dir.exists():
        return []

    pool = get_pool()
    applied: List[str] = []

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id SERIAL PRIMARY KEY,
                    filename TEXT NOT NULL UNIQUE,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            conn.commit()

            cur.execute("SELECT filename FROM schema_migrations")
            existing = {row["filename"] for row in cur.fetchall()}

            sql_files = sorted(migrations_dir.glob("*.sql"))
            for file_path in sql_files:
                filename = file_path.name
                if filename not in existing:
                    sql_content = file_path.read_text(encoding="utf-8")
                    cur.execute(sql_content)
                    cur.execute(
                        "INSERT INTO schema_migrations (filename) VALUES (%s)",
                        (filename,),
                    )
                    conn.commit()
                    applied.append(filename)

    return applied
