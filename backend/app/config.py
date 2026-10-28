import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from root or current directory
root_env = Path(__file__).resolve().parent.parent.parent / ".env"
if root_env.exists():
    load_dotenv(root_env)
else:
    load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://kaamai:change_me@localhost:5432/kaamai"
)
SESSION_SECRET = os.getenv("SESSION_SECRET", "change_me_super_secret_session_key_32_chars_min")
NODE_ENV = os.getenv("NODE_ENV", "development")
PORT = int(os.getenv("PORT", "4000"))
CORS_ORIGIN = os.getenv("CORS_ORIGIN", os.getenv("WEB_ORIGIN", "http://localhost:5173"))

# AI Configuration
AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama").strip().lower()

# Local Ollama
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "llama3.2")
OLLAMA_EMBEDDING_MODEL = os.getenv("OLLAMA_EMBEDDING_MODEL", "embeddinggemma")
OLLAMA_TIMEOUT_MS = int(os.getenv("OLLAMA_TIMEOUT_MS", "60000"))

# Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash")
GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
GEMINI_TIMEOUT_MS = int(os.getenv("GEMINI_TIMEOUT_MS", "60000"))

# File storage and quotas
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./data/uploads"))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "15"))
MAX_AGENT_STEPS = int(os.getenv("MAX_AGENT_STEPS", "5"))
