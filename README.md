# KaamAI

KaamAI is a local-first AI operations assistant for freelancers and small businesses. It is being built phase by phase from the requirements and delivery plan in [docs/SRS.md](docs/SRS.md) and [docs/PHASES.md](docs/PHASES.md). The current app is a frontend demo plus a minimal API health service; it is not yet a production backend.

## Current status

- Phase 0: product/environment baseline documented; Docker and Ollama were not available on the checked development machine.
- Phase 1: complete for the foundation milestone; responsive landing page, preserved dashboard shell, workspace scripts, and safe API health endpoint are available.
- Phase 2: complete — database (PostgreSQL connection pool, migrations, schema), authentication (register/login/logout/me/change-password, express-session, bcryptjs, CSRF protection), authorization middleware, and 10 passing auth tests.
- Auth, database, file processing, Ollama inference, and real RAG: database and auth are implemented; file processing, Ollama inference, and real RAG are later phases and are not implemented yet.

See [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) for verified commands/results and known limitations.

## Repository structure

- `apps/web` — React + Vite + TypeScript + Tailwind frontend
- `apps/server` — Node.js + Express + TypeScript API
- `docs` — requirements, phase plan, decisions, security checklist, and evaluation plan
- `docs/adr` — architecture decision records

## Requirements

- Node.js 24 or a supported current LTS release, npm, and Git.
- Docker and Ollama are not required for the Phase 1 shell; they will be needed/tested for later database and local-AI phases.
- This development machine has 8 GB RAM and a 4-core CPU. Local model performance may be limited; choose a small quantized model and measure it before relying on it.

## Local setup (Windows PowerShell)

1. Install workspace dependencies from the repository root: `npm install`
2. Copy the placeholder environment file if you need local overrides: `Copy-Item .env.example .env`
3. Start frontend and API together: `npm run dev`
4. Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The API health check is available at `http://localhost:5173/api/health` or `http://localhost:4000/api/health`.

Alternatively run `npm run dev:web` and `npm run dev:server` in separate terminals. The web app's Vite development proxy forwards `/api` requests to port 4000.

## Validation commands

- `npm run format:check` — formatting check for Phase 1 files and project docs.
- `npm run lint` — ESLint for the new server and landing page; legacy screens are preserved and checked by TypeScript/build.
- `npm run typecheck` — TypeScript checks for each workspace.
- `npm test` — API health and safe not-found tests.
- `npm run build` — production builds for all workspaces.

## Architecture decisions and costs

- Preserve the existing web app; add a separate Express API.
- PostgreSQL + pgvector is the single planned database/vector backend (Phase 2); Qdrant will not run alongside it.
- Ollama is the planned local-only AI provider. Hosted inference is not configured and must never be used as a silent fallback.
- Local development is free of mandatory AI API charges, but public hosting, storage, domain, backups, and optional hosted APIs may cost money. Free-tier terms and quotas can change.
- Never place real secrets in source control. Keep local `.env` ignored; `.env.example` contains placeholders only.

## Documentation

- [SRS](docs/SRS.md)
- [Implementation phases](docs/PHASES.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Decision log](docs/DECISIONS.md)
- [Security checklist](docs/SECURITY_CHECKLIST.md)
- [Evaluation plan](docs/EVALUATION_PLAN.md)
- [Changelog](CHANGELOG.md)
