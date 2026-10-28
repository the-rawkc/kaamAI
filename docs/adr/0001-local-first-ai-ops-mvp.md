# ADR 0001: Local-first AI Ops MVP

- Status: Accepted
- Date: 2026-10-18

## Context

KaamAI is being built as a privacy-conscious AI operations assistant for freelancers and small businesses. The product must work without mandatory paid APIs and must be easy to run locally during development.

## Decision

We will preserve the existing web UI and build the initial product around a local-first architecture:

- React + Vite + TypeScript frontend for the product experience
- Node.js + Express + TypeScript API as a separate workspace
- PostgreSQL as the primary relational database
- pgvector as the vector store for local document search
- Ollama as the default local AI provider
- Local filesystem storage for development uploads, outside the public web root
- Session-based auth with user and workspace ownership checks
- Human approval flows for actions that may affect data or external communications

Qdrant will not be deployed alongside pgvector in the MVP. Hosted inference is opt-in only and is never a silent fallback.

## Consequences

### Positive

- No mandatory external API key for early development
- Easier privacy compliance and local experimentation
- Clear path to production-grade architecture with minimal vendor lock-in

### Negative

- Local model performance depends on machine resources
- Some features need additional setup for PostgreSQL and embeddings
- We must be careful with prompt safety and authorization rules

## Follow-up

The development machine was checked on 2026-10-18: Node v24.12.0, npm 11.6.2, approximately 8 GB RAM, Intel i7-8565U (4 cores/8 threads); Docker and Ollama were not found on PATH. Validate model performance and Docker availability before Phases 2/5. No hosted provider terms were relied on or checked; do not assume any hosted free tier is permanent or unlimited.
