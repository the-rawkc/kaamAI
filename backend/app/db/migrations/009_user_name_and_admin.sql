-- Migration 009: Add name and is_active to users, support admin controls
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill name from email prefix if name is NULL
UPDATE users
SET name = INITCAP(SPLIT_PART(email, '@', 1))
WHERE name IS NULL OR name = '';
