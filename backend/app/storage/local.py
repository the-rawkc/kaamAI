import os
import uuid
from pathlib import Path
from ..config import UPLOAD_DIR


def ensure_upload_dir() -> Path:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOAD_DIR


def generate_storage_key() -> str:
    return uuid.uuid4().hex


def storage_path_for(storage_key: str) -> Path:
    # Prevent directory traversal
    safe_key = os.path.basename(storage_key)
    base_dir = ensure_upload_dir().resolve()
    target_path = (base_dir / safe_key).resolve()
    if not str(target_path).startswith(str(base_dir)):
        raise ValueError("Invalid storage key path.")
    return target_path


def save_file(storage_key: str, data: bytes) -> Path:
    target = storage_path_for(storage_key)
    target.write_bytes(data)
    return target


def read_file(storage_key: str) -> bytes:
    target = storage_path_for(storage_key)
    if not target.exists():
        raise FileNotFoundError(f"Storage file {storage_key} not found.")
    return target.read_bytes()


def delete_file(storage_key: str) -> bool:
    try:
        target = storage_path_for(storage_key)
        if target.exists():
            target.unlink()
            return True
        return False
    except Exception:
        return False
