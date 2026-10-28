# Changelog

Notable project changes are recorded here. Dates use ISO format.

## 2026-10-27

- Completed Phase 14 — Deployment and containerization:
  - Added multi-stage Node 22 `Dockerfile` for backend server with non-root security user and curl healthcheck.
  - Added multi-stage Vite/Nginx `Dockerfile` and `nginx.conf` reverse proxy for web SPA.
  - Created `infra/docker-compose.yml` orchestrating PostgreSQL, Ollama, Express server, and Nginx web.
  - Added automated timestamped backup scripts (`infra/backup-db.sh` and `infra/backup-db.ps1`) with 7-day automated pruning.
  - Added production environment configuration template (`.env.production.example`).
  - Added comprehensive operational runbook in `docs/DEPLOYMENT.md`.
- Completed Phase 12 — Security, Reliability & Evaluation:
  - Added `express-rate-limit` protection on auth, file upload, and AI agent routes.
  - Neutralized spreadsheet formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`) in `csv-sanitizer.ts`.
  - Added synthetic test fixtures for policy evaluation, adversarial prompt injection defense, and grounding verification.
- Completed Phases 3 through 11:
  - Core file library with content checks, random disk storage keys, and workspace quota.
  - Text extraction and deterministic CSV parsing with quote/comma handling.
  - Local AI adapter via Ollama with `llama3.2` and `embeddinggemma`.
  - Embedding pipeline with pgvector and resilient JSONB cosine fallback.
  - Grounded RAG with exact chunk citation mapping and cautious no-evidence fallback.
  - Structured business data import and read-only deterministic business calculation tools.
  - Multi-step bounded agent orchestration with human approval and draft-first workflows.
- Verification: 28 automated tests across 11 suites passing 100%; lint, typecheck, format check, and builds all clean.

## 2026-10-20

- Completed Phase 2 — Database and authentication.
- Added PostgreSQL connection pool with graceful fallback (`pg`), schema migrations, and initial schema (workspaces, users, sessions, password_reset_tokens, audit_logs).
- Added `express-session` + `connect-pg-simple` session store, `bcryptjs` password hashing, `cookie-parser` CSRF double-submit protection.
- Added auth models (users, workspaces), auth middleware (requireAuth, optionalAuth, loadUser, requireRole, requireWorkspaceOwnership), and auth routes (register, login, logout, me, change-password, csrf-token).
- Wired session middleware into Express app with secure cookies (httpOnly, SameSite=Lax, secure in production, 7-day maxAge).
- Added graceful shutdown (SIGTERM/SIGINT) that closes the database pool.
- Added 10 authentication/authorization tests; all passing against live database.
- Resolved open decisions D-009 through D-013 (auth library, session design, CSRF, account reset, database connection).
- All validation passes: lint, format:check, typecheck, test (10 tests), build.

## 2026-10-18

- Established Phase 0 documentation baseline from the supplied KaamAI SRS and implementation plan.
- Added local-first decisions and recorded detected machine/runtime constraints.
- Preserved the React/Vite dashboard and added a standalone landing page plus an Express API health endpoint.
- Initialized the Git repository on `main` without staging or committing files.
- Added workspace scripts for concurrent development, linting, formatting, type checking, tests, and builds.
- Verified Phase 0/1 with lint, format check, type checks, health/not-found tests, production builds, and mobile-width smoke checks.
