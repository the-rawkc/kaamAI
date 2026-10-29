import secrets
from typing import Optional
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr
from ..models.user import (
    create_user,
    find_user_by_email,
    find_user_by_id,
    update_user_password,
)
from ..models.workspace import create_workspace
from ..middleware.auth import (
    SESSION_COOKIE,
    CSRF_COOKIE,
    create_session,
    destroy_session,
    get_current_user,
    get_optional_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: Optional[str] = None
    email: EmailStr
    password: str
    workspace_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.get("/csrf-token")
def get_csrf_token(response: Response):
    token = secrets.token_hex(24)
    response.set_cookie(
        key=CSRF_COOKIE,
        value=token,
        httponly=False,
        samesite="lax",
    )
    return {"csrf_token": token}


@router.post("/register")
def register(body: RegisterRequest, response: Response):
    existing = find_user_by_email(body.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "EMAIL_EXISTS", "message": "Email is already registered."}},
        )

    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "WEAK_PASSWORD", "message": "Password must be at least 8 characters."}},
        )

    # Create isolated workspace for new user
    ws_name = body.workspace_name or (f"{body.name}'s Workspace" if body.name else f"{body.email.split('@')[0]}'s Workspace")
    workspace = create_workspace(name=ws_name)

    hashed_pw = bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = create_user(
        email=body.email,
        password_hash=hashed_pw,
        role="owner",
        workspace_id=str(workspace["id"]),
        name=body.name,
    )

    sid = create_session(user)
    response.set_cookie(
        key=SESSION_COOKIE,
        value=sid,
        httponly=True,
        samesite="lax",
        max_age=604800,
    )
    csrf_token = secrets.token_hex(24)
    response.set_cookie(
        key=CSRF_COOKIE,
        value=csrf_token,
        httponly=False,
        samesite="lax",
    )

    return {
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "name": user.get("name") or (body.name or user["email"].split("@")[0].capitalize()),
            "role": user["role"],
            "workspace_id": str(user["workspace_id"]),
            "created_at": user["created_at"],
        },
        "workspace": workspace,
    }


@router.post("/login")
def login(body: LoginRequest, response: Response):
    user = find_user_by_email(body.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."}},
        )

    valid_pw = bcrypt.checkpw(
        body.password.encode("utf-8"),
        user["password_hash"].encode("utf-8"),
    )
    if not valid_pw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."}},
        )

    if user.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "ACCOUNT_DISABLED", "message": "Your account has been deactivated by an administrator."}},
        )

    sid = create_session(user)
    response.set_cookie(
        key=SESSION_COOKIE,
        value=sid,
        httponly=True,
        samesite="lax",
        max_age=604800,
    )
    csrf_token = secrets.token_hex(24)
    response.set_cookie(
        key=CSRF_COOKIE,
        value=csrf_token,
        httponly=False,
        samesite="lax",
    )

    return {
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "name": user.get("name") or user["email"].split("@")[0].capitalize(),
            "role": user["role"],
            "workspace_id": str(user["workspace_id"]),
            "created_at": user["created_at"],
        }
    }


@router.post("/logout")
def logout(request: Request, response: Response):
    sid = request.cookies.get(SESSION_COOKIE) or request.cookies.get("kaamai_session")
    if sid:
        destroy_session(sid)
    response.delete_cookie(SESSION_COOKIE)
    response.delete_cookie(CSRF_COOKIE)
    return {"message": "Logged out successfully"}


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return {
        "user": {
            "id": current_user["id"],
            "email": current_user["email"],
            "name": current_user.get("name") or current_user["email"].split("@")[0].capitalize(),
            "role": current_user["role"],
            "workspace_id": current_user["workspace_id"],
            "created_at": current_user["created_at"],
        }
    }


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest, current_user: dict = Depends(get_current_user)
):
    user_with_hash = find_user_by_email(current_user["email"])
    if not user_with_hash:
        raise HTTPException(status_code=404, detail="User not found")

    valid_pw = bcrypt.checkpw(
        body.current_password.encode("utf-8"),
        user_with_hash["password_hash"].encode("utf-8"),
    )
    if not valid_pw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_CURRENT_PASSWORD", "message": "Current password is incorrect."}},
        )

    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "WEAK_PASSWORD", "message": "New password must be at least 8 characters."}},
        )

    new_hash = bcrypt.hashpw(body.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    update_user_password(current_user["id"], new_hash)
    return {"message": "Password updated successfully"}
