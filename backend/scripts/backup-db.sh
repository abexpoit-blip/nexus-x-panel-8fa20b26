#!/usr/bin/env bash
# NexusX SQLite daily backup
# Usage:  /opt/nexus/nexus-x-panel/backend/scripts/backup-db.sh
# Cron:   0 4 * * * /opt/nexus/nexus-x-panel/backend/scripts/backup-db.sh >> /var/log/nexus-backup.log 2>&1
#
# Copies backend/data/nexus.db → /opt/nexus/backups/nexus-YYYY-MM-DD-HHMM.db
# Uses sqlite3 .backup (atomic, safe while DB is in use)
# Keeps last 14 days, removes older files.

set -euo pipefail

# ---- Configuration ----
APP_DIR="${APP_DIR:-/opt/nexus/nexus-x-panel}"
DB_PATH="${DB_PATH:-$APP_DIR/backend/data/nexus.db}"
BACKUP_DIR="${BACKUP_DIR:-/opt/nexus/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"

# ---- Pre-flight ----
if [ ! -f "$DB_PATH" ]; then
  echo "[$(date)] ERROR: DB not found at $DB_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TS=$(date +%F-%H%M)
OUT="$BACKUP_DIR/nexus-$TS.db"

# ---- Atomic backup using sqlite3's online backup API ----
# This is safe even while the backend is writing to the DB.
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_PATH" ".backup '$OUT'"
else
  # Fallback: file copy (only safe if WAL is checkpointed)
  cp "$DB_PATH" "$OUT"
fi

# Compress to save disk space (~70% smaller for SQLite)
gzip -f "$OUT"
SIZE=$(du -h "$OUT.gz" | cut -f1)

echo "[$(date)] ✓ Backup saved: $OUT.gz ($SIZE)"

# ---- Rotate: delete backups older than RETAIN_DAYS ----
DELETED=$(find "$BACKUP_DIR" -name 'nexus-*.db.gz' -mtime +$RETAIN_DAYS -print -delete 2>/dev/null | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] ✓ Rotated $DELETED backup(s) older than $RETAIN_DAYS days"
fi

# ---- Summary ----
TOTAL=$(find "$BACKUP_DIR" -name 'nexus-*.db.gz' | wc -l)
echo "[$(date)] ✓ Total backups in $BACKUP_DIR: $TOTAL"
