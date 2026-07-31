#!/usr/bin/env bash
# Scheduled Postgres backup with daily/weekly/monthly retention.
#
# Usage: DATABASE_URL=postgresql://... ./scripts/backup.sh
# Run from cron, e.g. daily at 2am:
#   0 2 * * * cd /path/to/kintsu-os && ./scripts/backup.sh >> /var/log/kintsu-backup.log 2>&1
#
# Point-in-time recovery / automatic failover / cross-region replication
# are properties of the managed Postgres service you deploy to (RDS,
# Cloud SQL, Neon, Supabase, ...) — this script covers the logical
# daily/weekly/monthly dump rotation the spec calls for on top of that.

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
BACKUP_DIR="${BACKUP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups}"
RETENTION_DAILY="${BACKUP_RETENTION_DAILY:-7}"
RETENTION_WEEKLY="${BACKUP_RETENTION_WEEKLY:-4}"
RETENTION_MONTHLY="${BACKUP_RETENTION_MONTHLY:-12}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DAY_OF_WEEK="$(date +%u)"   # 1 = Monday
DAY_OF_MONTH="$(date +%d)"

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/monthly"

DUMP_FILE="$BACKUP_DIR/daily/kintsu-${TIMESTAMP}.sql.gz"
echo "Dumping database to $DUMP_FILE ..."
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$DUMP_FILE"

if [ "$DAY_OF_WEEK" = "7" ]; then
  cp "$DUMP_FILE" "$BACKUP_DIR/weekly/kintsu-${TIMESTAMP}.sql.gz"
fi
if [ "$DAY_OF_MONTH" = "01" ]; then
  cp "$DUMP_FILE" "$BACKUP_DIR/monthly/kintsu-${TIMESTAMP}.sql.gz"
fi

prune() {
  local dir="$1" keep="$2"
  # shellcheck disable=SC2012
  ls -1t "$dir"/*.sql.gz 2>/dev/null | tail -n "+$((keep + 1))" | xargs -r rm -f
}
prune "$BACKUP_DIR/daily" "$RETENTION_DAILY"
prune "$BACKUP_DIR/weekly" "$RETENTION_WEEKLY"
prune "$BACKUP_DIR/monthly" "$RETENTION_MONTHLY"

if [ -n "${BACKUP_S3_PREFIX:-}" ] && [ -n "${S3_BUCKET:-}" ] && command -v aws >/dev/null 2>&1; then
  ENDPOINT_ARGS=()
  [ -n "${S3_ENDPOINT:-}" ] && ENDPOINT_ARGS=(--endpoint-url "$S3_ENDPOINT")
  echo "Uploading to s3://${S3_BUCKET}/${BACKUP_S3_PREFIX}/ ..."
  aws s3 cp "$DUMP_FILE" "s3://${S3_BUCKET}/${BACKUP_S3_PREFIX}/$(basename "$DUMP_FILE")" \
    "${ENDPOINT_ARGS[@]}" --region "${S3_REGION:-auto}"
else
  echo "Skipping remote upload (set BACKUP_S3_PREFIX, S3_BUCKET and install the AWS CLI to enable it)."
fi

echo "Backup complete: $DUMP_FILE"
