# KaamAI Software Requirements Specification

**Version:** 1.0 · **Date:** 18 October 2026 · **Status:** Draft baseline for implementation

> This Markdown document captures the SRS supplied in the project conversation. It is the temporary source of truth until the original DOCX is checked into `docs/`. Product decisions and implementation status are tracked separately.

## 1. Product and goals

KaamAI is a local-first AI operations assistant for freelancers and small businesses. The MVP helps nontechnical users upload invoices and business files, inspect extracted information, import CSV records, ask grounded questions with citations, and prepare reports or customer-message drafts for human review. It demonstrates RAG, controlled tool use, orchestration, structured outputs, evaluation, and safety without requiring paid AI services.

Primary goals: explain users' own business information in natural language; minimize early operating costs; support Ollama for local chat and embeddings; retain modular provider/storage/vector interfaces; and ship a narrow, testable workflow before adding integrations.

## 2. Non-goals

The MVP is not an autonomous system that sends communications or changes external systems without approval; not accounting, tax, legal, or financial advice; not a universal integration platform; not guaranteed to parse every scanned or malformed file; and not dependent on a single paid model or vector vendor.

## 3. Users and workflow

Personas include freelancers following up invoices, small-business operators reviewing sales/stock, nontechnical document users, and founder/admin users managing workspace, quotas, providers, and audit history.

Primary workflow: upload a CSV or invoice → extract and validate → review and confirm records → ask questions → retrieve authorized sources or invoke approved business tools → inspect results/citations → prepare a report or email draft → review and export.

## 4. MVP scope

- Responsive dashboard and guided onboarding.
- Account authentication and personal workspace; organization UI may be deferred while preserving an extensible ownership model.
- PDF, TXT, CSV, and only those image types with an implemented extraction path; validate MIME, extension, size, and page/row bounds.
- Digital PDF/TXT extraction and deterministic CSV parsing. OCR for scanned files is later work.
- Document library with metadata, status, delete, and re-index operations.
- RAG answers with document/page/chunk citations and an honest insufficient-evidence fallback.
- Deterministic business calculations for imported records, including totals, date filters, groupings, and overdue calculations when due dates exist.
- Server-side allow-listed tools; schema validation; per-user/workspace authorization; timeouts, step and result limits.
- Markdown/CSV report export; email/message drafts only, never automatic sending.
- Usage limits, actionable errors, redacted logs, provider health, and optional explicitly configured hosted provider support.

Later work may add Drive/Sheets OAuth, email draft creation, scheduled workflows, teams/roles/plans, messaging integrations, OCR, reranking, multilingual voice, and advanced analytics.

## 5. Functional requirements

| ID     | Requirement                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| FR-001 | Allow account creation, sign-in/out, and access reset with the selected established auth approach.                              |
| FR-002 | Associate every user record with a workspace/user and enforce ownership server-side on every query.                             |
| FR-003 | Validate upload MIME, extension, size, and page/row limits before processing.                                                   |
| FR-004 | Extract supported content, track processing status, and report actionable unsupported/corrupt-file errors.                      |
| FR-005 | Chunk extracted text and store document/workspace/source metadata plus embedding model/version.                                 |
| FR-006 | Retrieve only authorized chunks and cite sources when evidence is available.                                                    |
| FR-007 | State when evidence is insufficient; ask a clarifying question where useful.                                                    |
| FR-008 | Preview CSV rows, map columns, validate, and require user confirmation before import.                                           |
| FR-009 | Execute only server-registered tools; never execute model-generated code or arbitrary SQL.                                      |
| FR-010 | Validate tool inputs, authorize user/workspace, and bound time, output, and result size.                                        |
| FR-011 | Provide authorized document search, sales summaries, invoice listing, overdue totals, and report preparation where data exists. |
| FR-012 | Create drafts/proposed changes first; require explicit approval for consequential external actions.                             |
| FR-013 | Bound agent steps/deadlines and persist understandable run state/progress.                                                      |
| FR-014 | Apply documented conversation-retention settings and allow history deletion.                                                    |
| FR-015 | Export reports in Markdown or CSV in the MVP.                                                                                   |
| FR-016 | Support local Ollama and optional hosted providers behind a common interface.                                                   |
| FR-017 | Enforce user request, token/context, upload, and agent-run limits.                                                              |
| FR-018 | Record sanitized run status, latency, available usage metadata, and safe errors without secrets/raw sensitive documents.        |
| FR-019 | Delete documents and derived chunks safely; surface and retry deletion failures.                                                |
| FR-020 | Make core flows keyboard navigable, mobile-readable, and provide loading/empty/error/success states.                            |
| FR-021 | Treat retrieved document content as untrusted data, never as policy or tool authorization.                                      |
| FR-022 | On provider outage/quota, show clear retry/fallback guidance and never silently send sensitive data elsewhere.                  |
| FR-023 | Audit who approved each approval-required action, what was approved, and its result.                                            |
| FR-024 | Maintain repeatable tests for grounding, extraction, tool selection, authorization, and failures.                               |

## 6. Non-functional requirements

- Core local development and demo workflow must not require a paid AI API.
- Long work reports status rather than blocking indefinitely; calls have timeouts and bounded retries/backoff.
- Enforce resource authorization, secure cookies/sessions in deployment, minimum data collection, provider disclosure, and deletion.
- Use TypeScript, lint/format, request schema validation, migrations, modular services, and automated tests.
- Docker Compose documents portable local dependencies; jobs are separated when needed.
- Aim for WCAG 2.1 AA for core flows; provide sanitized structured logs, health checks, request IDs, run tracing, and usage counters.

## 7. Architecture baseline

React + Vite + TypeScript + Tailwind frontend; Node.js + Express + TypeScript REST API; PostgreSQL with pgvector as the initial relational/vector store; Ollama for local chat and embeddings; local filesystem storage for development; established session auth; deterministic PDF/TXT/CSV parsing; in-process processing initially. Qdrant, hosted providers, OCR, and Redis are not part of the initial architecture. Free hosted API quotas/terms are variable and must not be represented as unlimited.

Request path: Web UI → Express API (authentication, limits, validation) → application services (ingestion, RAG, agent, business tools, provider adapters) → repository layer → PostgreSQL/pgvector and local file store. A background worker is deferred until asynchronous workload warrants one.

## 8. Agent execution and RAG rules

Agent tools are server registered and input-schema validated. Verify identity, workspace, permission, limits, and deadline for every call. Never execute generated shell, `eval`, arbitrary code, or raw model SQL. Initial maximum is five tool rounds; use per-tool timeouts/output caps and deterministic summaries. Keep read tools separate from draft/write tools; external side effects need explicit confirmation. Persist sanitized run/tool metadata. Retrieved content and imported cells are untrusted.

Chunk by headings/paragraphs with an initial target of 500–800 tokens and modest overlap; preserve page/source location; batch embeddings; filter every retrieval by workspace/document authorization; index idempotently and replace stale chunks on reprocess. Use the same embedding model/dimension for indexing and query. Start with top-k 4–6. Cite retrieved chunk IDs mapped to document/page references. Weak evidence must result in a cautious answer, not fabricated sources.

## 9. Initial data entities

Users; workspaces; optional workspace members; documents; document chunks; conversations; messages; imports; business records; agent runs; tool executions; approval requests; audit logs; provider settings. User/workspace ownership is required. Store provider secrets only in environment/secrets storage, never plaintext settings.

## 10. Proposed API

`POST /api/auth/register`, `/api/auth/login`; `GET /api/health`; document upload/list/detail/delete/reindex; `POST /api/chat`; conversation list/detail; import preview/confirm; agent-run status/approval; usage. Additional conversation deletion, report export, and provider-setting routes must be specified before their respective feature phases.

## 11. Security, privacy, and errors

Keep secrets server-side; enforce authorization on every resource; use secure cookies, CSRF protection where applicable, HTTPS, and restrictive CORS in deployment. Store uploads outside public web roots using random keys; prevent traversal; enforce quotas; redact sensitive logs; disclose hosted processing and require user choice. Treat retrieved text and imported cells as untrusted; defend against prompt/formula injection. Audit approvals and make writes idempotent. Provider outages, unsupported files, weak evidence, unauthorized tools, timeouts, and step limits must produce safe, understandable errors.

## 12. Acceptance criteria

- Upload a supported file and see processing status.
- Grounded answers cite real sources; unsupported questions do not invent citations.
- Cross-user document access is denied even if IDs/query parameters are changed.
- Invalid tool schemas fail before execution; unknown tools and excess steps are rejected.
- External writes cannot proceed without approval; approval is auditable.
- Local operation works with documented Ollama configuration and no paid key; missing providers explain setup.
- Document deletion removes original and searchable chunks.
- Rate limits are friendly and bounded; automated tests cover RAG, permissions, tools, and deletion.

## 13. Risks and open decisions

Risks include changing free-tier quotas, slow local models, hallucinations, prompt injection, privacy concerns, scope creep, and unexpected hosting costs. Mitigate with local-first defaults, model configuration, citations/evaluation, tool allow-lists, approvals, disclosure/deletion, narrow vertical scope, and cost monitoring.

Before the relevant implementation phase, quantify limits; decide auth/session behavior, retention, supported images, import field/currency/date semantics, CSV rollback, and whether processing is synchronous. Public launch requires product-name/domain/trademark checks and a security review; do not claim regulated-data suitability.
