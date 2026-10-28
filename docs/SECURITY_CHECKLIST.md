# Security checklist

Use synthetic data in development until access control and deletion are verified. Track each item during its owning phase; this is not a claim of completed security review.

## Phase 0–1

- [x] `.env` and `.env.*` are ignored; `.env.example` contains placeholders only.
- [x] Error responses avoid stack traces, secrets, prompts, and internal configuration.
- [x] Health endpoint exposes status only, not database/provider details.

## Phase 2 — identity and data boundaries

- [x] Use established password/session implementation; secure, HttpOnly, SameSite cookies in production.
- [x] CSRF protections and restrictive CORS where applicable.
- [x] Every query and resource operation checks authenticated user/workspace ownership.
- [x] Tests prove cross-user read/update/delete attempts fail closed.
- [x] Secret rotation and safe environment validation documented.

## Phase 3–4 — files and imports

- [x] Validate extension, declared MIME, PDF signature, size, empty files, and text encoding/binary content. Page/row limits are deferred to extraction/import phases.
- [x] Random storage IDs; uploads outside public root; storage-key validation prevents traversal.
- [x] No user-controlled path is passed to filesystem operations.
- [x] Verify persisted deletion and cross-workspace denial against PostgreSQL; retries/derived-data deletion require later processing phases.
- [x] CSV import requires explicit confirmation; exports neutralize spreadsheet formula injection.

## Phase 5–10 — AI and tools

- [x] No hosted provider fallback without clear user choice and disclosure.
- [x] Retrieved text is untrusted; prompt injection cannot grant permissions or alter policy.
- [x] Tool registry is allow-listed, schema-validated, authorized, bounded, and time-limited.
- [x] No model-generated SQL, shell commands, eval, or dynamic code execution.
- [x] RAG filters by workspace before retrieval; citation mapping is server-generated.
- [x] Logs redact prompts/document content, tokens, keys, and sensitive outputs.

## Phase 11–14 — actions and release

- [x] Drafts have no external side effect until explicit approval.
- [x] Approval actor, exact action, result, and idempotency are auditable.
- [x] Rate limits, request IDs, secure headers, HTTPS, backup/deletion policy, and dependency scanning configured.
- [x] Provider outage/429/timeout and deletion failures are tested.
- [x] Synthetic evaluation fixtures and prompt injection defense benchmarked.
