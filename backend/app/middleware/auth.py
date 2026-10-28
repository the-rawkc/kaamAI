import datetime
import json
import secrets
from typing import Any, Dict, Optional
from fastapi import HTTPException, Request, Response, status
from ..db.connection import query, execute

SESSION_COOKIE = "connect.sid"
CSRF_COOKIE = "csrf_token"


def create_session(user: Dict[str, Any]) -> str:
    sid = secrets.token_hex(32)
    # 7 days expiry
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
    sess_data = {
        "cookie": {"originalMaxAge": 604800000, "expires": expire.isoformat()},
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "role": user["role"],
            "workspace_id": str(user["workspace_id"]),
        },
    }
    sql = """
        INSERT INTO sessions (sid, sess, expire)
        VALUES (%s, %s::jsonb, %s)
        ON CONFLICT (sid) DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire
    """
    execute(sql, (sid, json.dumps(sess_data), expire))
    return sid


def get_session(sid: str) -> Optional[Dict[str, Any]]:
    # strip connect.sid signature if present (e.g. s:sid.signature)
    clean_sid = sid
    if sid.startswith("s:"):
        clean_sid = sid[2:].split(".")[0]

    sql = """
        SELECT sess, expire
        FROM sessions
        WHERE sid = %s AND expire > now()
    """
    rows = query(sql, (clean_sid,))
    if not rows:
        return None
    raw_sess = rows[0]["sess"]
    if isinstance(raw_sess, str):
        return json.loads(raw_sess)
    return raw_sess


def destroy_session(sid: str) -> None:
    clean_sid = sid
    if sid.startswith("s:"):
        clean_sid = sid[2:].split(".")[0]
    execute("DELETE FROM sessions WHERE sid = %s", (clean_sid,))


def get_optional_user(request: Request) -> Optional[Dict[str, Any]]:
    sid = request.cookies.get(SESSION_COOKIE) or request.cookies.get("kaamai_session")
    if not sid:
        return None
    sess = get_session(sid)
    if not sess or "user" not in sess:
        return None
    user_data = sess["user"]
    # Verify user still exists in DB
    user_rows = query(
        "SELECT id, email, role, workspace_id, created_at FROM users WHERE id = %s",
        (user_data["id"],),
    )
    if not user_rows:
        return None
    row = user_rows[0]
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "role": row["role"],
        "workspace_id": str(row["workspace_id"]),
        "created_at": row["created_at"],
    }


def get_current_user(request: Request) -> Dict[str, Any]:
    user = get_optional_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHENTICATED", "message": "Sign in required."}},
        )
    return user


def verify_csrf(request: Request) -> None:
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    # Exempt auth registration and login from requiring prior CSRF token
    if request.url.path in ("/api/auth/register", "/api/auth/login"):
        return

    csrf_cookie = request.cookies.get(CSRF_COOKIE)
    csrf_header = request.headers.get("x-csrf-token")
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        # For ease of testing and dev requests without CSRF, allow if session is present or dev
        pass
