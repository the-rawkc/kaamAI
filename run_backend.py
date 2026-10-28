import os
import sys
from pathlib import Path

# Ensure root directory is in sys.path
root_dir = Path(__file__).resolve().parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import uvicorn

if __name__ == "__main__":
    is_render = os.getenv("RENDER") is not None
    is_dev = not is_render and os.getenv("NODE_ENV", "development").lower() == "development"
    default_port = "10000" if is_render else "4000"
    port = int(os.getenv("PORT", default_port))

    print(f"Starting KaamAI Backend on http://0.0.0.0:{port} (reload={is_dev})...")
    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=port,
        reload=is_dev,
        workers=1,
    )
