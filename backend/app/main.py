from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from .config import CORS_ORIGIN
from .db.connection import close_pool, run_migrations
from .routes.health import router as health_router
from .routes.auth import router as auth_router
from .routes.documents import router as documents_router
from .routes.search import router as search_router
from .routes.ai import router as ai_router
from .routes.conversations import router as conversations_router
from .routes.imports import router as imports_router
from .routes.tools import router as tools_router
from .routes.agent import router as agent_router
from .routes.approvals import router as approvals_router
from .routes.reports import router as reports_router
from .routes.dashboard import router as dashboard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run pending database schema migrations
    try:
        applied = run_migrations()
        if applied:
            print(f"Applied {len(applied)} database migrations: {applied}")
    except Exception as err:
        print(f"Migration error on startup: {err}")
    yield
    # Shutdown: Close database pool
    close_pool()


app = FastAPI(
    title="KaamAI Backend",
    version="1.0.0",
    description="Python FastAPI backend for KaamAI with local Ollama and Google Gemini dual AI engines",
    lifespan=lifespan,
)

# CORS middleware
origins = [
    CORS_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters.",
                "details": exc.errors(),
            }
        },
    )


# Mount API routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(search_router)
app.include_router(ai_router)
app.include_router(conversations_router)
app.include_router(imports_router)
app.include_router(tools_router)
app.include_router(agent_router)
app.include_router(approvals_router)
app.include_router(reports_router)
app.include_router(dashboard_router)

# Mount Vite frontend static files if built
web_dist = Path(__file__).resolve().parent.parent.parent / "apps" / "web" / "dist"
assets_dir = web_dist / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


@app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def catch_all(request: Request, path_name: str):
    # API 404 handler
    if path_name.startswith("api/") or path_name == "api":
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Endpoint not found: {request.method} /{path_name}",
                }
            },
        )

    # Static file check (e.g. favicon.svg, icons.svg)
    if web_dist.exists() and request.method == "GET":
        candidate_file = web_dist / path_name
        if path_name and candidate_file.is_file():
            return FileResponse(str(candidate_file))

        # SPA fallback: return index.html for all other frontend routes
        index_file = web_dist / "index.html"
        if index_file.is_file():
            return FileResponse(str(index_file))

    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": {
                "code": "NOT_FOUND",
                "message": f"Resource not found: {request.method} /{path_name}",
            }
        },
    )
