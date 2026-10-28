#!/usr/bin/env bash
# KaamAI Automated Database Backup Script
# Performs a timestamped pg_dump and enforces a 7-day retention policy.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
BACKUP_FILE="${BACKUP_DIR}/kaamai_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

echo "Starting KaamAI PostgreSQL backup..."

if command -v docker &> /dev/null && docker ps | grep -q "kaamai-db"; then
    echo "Backing up from Docker container kaamai-db..."
    docker exec kaamai-db pg_dump -U "${POSTGRES_USER:-kaamai}" "${POSTGRES_DB:-kaamai}" | gzip > "${BACKUP_FILE}"
else
    echo "Backing up via local pg_dump..."
    pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"
fi

echo "Backup created successfully: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Prune backups older than retention period
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "kaamai_backup_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "Backup routine completed."
