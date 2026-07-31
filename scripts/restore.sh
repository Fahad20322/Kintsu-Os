#!/usr/bin/env bash
# One-click restore from a backup produced by scripts/backup.sh.
#
# Usage: DATABASE_URL=postgresql://... ./scripts/restore.sh backups/daily/kintsu-20260101-020000.sql.gz
#
# WARNING: this overwrites the target database. Point DATABASE_URL at a
# fresh/empty database (or take your own backup first) before running.

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
DUMP_FILE="${1:?Usage: restore.sh <path-to-backup.sql.gz>}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Backup file not found: $DUMP_FILE" >&2
  exit 1
fi

echo "Restoring $DUMP_FILE into $DATABASE_URL"
read -r -p "This will overwrite the target database. Continue? [y/N] " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Aborted."
  exit 1
fi

gunzip -c "$DUMP_FILE" | psql "$DATABASE_URL"
echo "Restore complete."
