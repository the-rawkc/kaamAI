-- KaamAI Phase 4: Document content storage
-- Adds extracted_text and page_count columns to the documents table.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS page_count INTEGER,
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ;