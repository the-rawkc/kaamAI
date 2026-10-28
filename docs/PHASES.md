# KaamAI implementation phases

**Version:** 1.0 · **Date:** 18 October 2026 · **Status:** Implementation baseline

Build incrementally and keep the main branch runnable. Inspect before editing; use synthetic fixtures; run format/lint/type-check/tests/build after each phase; update `docs/IMPLEMENTATION_STATUS.md`; never commit credentials or real business documents. Timings are indicative only.

| Phase                                     | Scope                                                                                                  | Exit criteria                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 0 — Product & environment validation      | Confirm MVP, check machine/provider constraints, choose vector store, document scaffold.               | Install/start/build; no committed secrets.                                         |
| 1 — Monorepo foundation and UI shell      | React/Vite/TS/Tailwind shell, routes, shared contracts, landing/dashboard, Express API health.         | Web and API run locally; responsive layout and empty states.                       |
| 2 — Database and authentication           | PostgreSQL/pgvector local service, migrations, user/workspace schema, established secure auth/session. | Unauthenticated access blocked; authorization tests pass.                          |
| 3 — Core file library                     | Upload validation, random storage keys, metadata/list/detail/delete/status.                            | Supported files only; cross-user access denied; deletion removes file.             |
| 4 — Text extraction and CSV preview       | Digital PDF/TXT extraction, deterministic CSV parsing, preview/mapping/validation.                     | Fixtures parse; corrupt/unsupported inputs fail safely.                            |
| 5 — Local AI provider adapter             | Provider interface, Ollama chat adapter, health, config, timeouts/output parsing.                      | Local AI works without paid API; unavailable provider gives setup guidance.        |
| 6 — Embeddings and vector search          | Ollama embeddings, pgvector, chunks, metadata, index/reindex/delete sync.                              | Search works; same model and workspace authorization enforced.                     |
| 7 — RAG chat with citations               | Safe prompt assembly, top-k retrieval, citation mapping, insufficient-evidence path.                   | Evaluation questions cite relevant evidence; unsupported requests remain cautious. |
| 8 — Structured business data import       | Mapping, validation, preview, explicit confirmation, normalized/typed records.                         | No write before confirmation; invalid rows reported.                               |
| 9 — Deterministic business tools          | Sales totals, date ranges, top products, invoice lists, overdue totals.                                | Deterministic tested math, permission-scoped tools, invalid args rejected.         |
| 10 — Agent orchestration and tool calling | Allow-listed tools, bounded loop/steps/timeouts, run status/progress.                                  | Multi-step read workflows work; arbitrary tools/SQL impossible.                    |
| 11 — Human approvals and draft actions    | Report/email drafts, approval records, preview/edit/export.                                            | Drafts require review; no unapproved external effects.                             |
| 12 — Security, reliability, evaluation    | Limits, injection/auth/deletion tests, sanitized logs, retries, evaluation set.                        | Cross-user requests fail closed; core acceptance suite passes.                     |
| 13 — First integration (optional)         | One opt-in Drive or Sheets integration; OAuth and revoke flow.                                         | Narrow least-privilege access; secrets stay server-side.                           |
| 14 — Deployment and private beta          | Hosting decision, HTTPS/secrets/backups/logging/limits/demo/feedback.                                  | Fresh deploy documented; no debug secrets; data deletion available.                |
| 15 — Iterate from evidence                | User interviews and measure outcomes, grounding, failures, latency, quotas.                            | Improvements follow evidence and cost review.                                      |

## MVP definition of done

A fresh developer can start the app from the README. The main flow works locally with Ollama, supports upload/query/citation/deletion and confirmed CSV imports, and runs at least three tested allow-listed tools in a multi-step workflow. Calculations are deterministic, drafts require review, security/provider failure tests pass, and limitations/privacy/costs are documented.

## Scope guardrails

Do not add multiple autonomous agents, integrations before local workflows are reliable, model-generated SQL, unreviewed external side effects, or claims of zero public-hosting cost/unlimited free API use.
