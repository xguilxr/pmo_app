#!/usr/bin/env bash
# ============================================================================
# MySQL Backup Script for PMO Platform
#
# Creates timestamped, compressed backups and rotates old ones.
#
# Usage:
#   ./scripts/backup_db.sh                # Uses defaults / env vars
#   BACKUP_DIR=/mnt/backups ./scripts/backup_db.sh
#
# Cron example (daily at 2 AM):
#   0 2 * * * /opt/pmo_app/scripts/backup_db.sh >> /var/log/pmo/backup.log 2>&1
#
# Required env vars (or defaults):
#   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration (override via environment)
# ---------------------------------------------------------------------------
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-pmo_db}"
DB_USER="${DB_USER:-pmo_user}"
DB_PASSWORD="${DB_PASSWORD:-}"

BACKUP_DIR="${BACKUP_DIR:-/opt/pmo_app/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"           # Delete backups older than this
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/pmo_backup_${TIMESTAMP}.sql.gz"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[BACKUP $(date '+%Y-%m-%d %H:%M:%S')]${NC} $*"; }
err()  { echo -e "${RED}[ERROR $(date '+%Y-%m-%d %H:%M:%S')]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------
if ! command -v mysqldump &>/dev/null; then
    err "mysqldump not found. Install mysql-client."
    exit 1
fi

mkdir -p "$BACKUP_DIR"

# ---------------------------------------------------------------------------
# Backup
# ---------------------------------------------------------------------------
log "Starting backup of ${DB_NAME}@${DB_HOST}:${DB_PORT}..."

if mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
    ${DB_PASSWORD:+--password="$DB_PASSWORD"} \
    --single-transaction --routines --triggers --events \
    "$DB_NAME" | gzip > "$BACKUP_FILE"; then

    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup complete: ${BACKUP_FILE} (${SIZE})"
else
    err "Backup FAILED"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# ---------------------------------------------------------------------------
# Rotation -- delete backups older than RETENTION_DAYS
# ---------------------------------------------------------------------------
DELETED=$(find "$BACKUP_DIR" -name "pmo_backup_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
if [[ "$DELETED" -gt 0 ]]; then
    log "Rotated ${DELETED} backup(s) older than ${RETENTION_DAYS} days"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
TOTAL=$(find "$BACKUP_DIR" -name "pmo_backup_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Backup directory: ${BACKUP_DIR} -- ${TOTAL} file(s), ${TOTAL_SIZE} total"
