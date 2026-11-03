#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${RESTORE_TARGET:?Set RESTORE_TARGET=isolated after verifying this is not production}"
: "${BACKUP_FILE:?Set BACKUP_FILE to an encrypted .dump.age file}"
: "${BACKUP_AGE_IDENTITY:?Set BACKUP_AGE_IDENTITY to the age identity file}"
: "${PGHOST:?Set PGHOST to the isolated PostgreSQL host}"
: "${PGUSER:?Set PGUSER to the restore database user}"
: "${PGDATABASE:?Set PGDATABASE to the isolated database name}"
: "${PGPASSFILE:?Set PGPASSFILE to a permission-restricted PostgreSQL passfile}"

if [[ "$RESTORE_TARGET" != "isolated" ]]; then
  echo "Refusing restore: RESTORE_TARGET must be exactly 'isolated'." >&2
  exit 1
fi
if [[ ! -f "$BACKUP_FILE" || ! -f "$BACKUP_AGE_IDENTITY" ]]; then
  echo "Backup or age identity file does not exist." >&2
  exit 1
fi
if ! command -v pg_restore >/dev/null 2>&1 || ! command -v age >/dev/null 2>&1; then
  echo "pg_restore and age must be installed." >&2
  exit 1
fi

temporary_file="$(mktemp "${TMPDIR:-/tmp}/apivault-restore.XXXXXX")"
cleanup() { rm -f "$temporary_file"; }
trap cleanup EXIT
export PGSSLMODE="${PGSSLMODE:-require}"
age --decrypt --identity "$BACKUP_AGE_IDENTITY" --output "$temporary_file" "$BACKUP_FILE"
pg_restore --clean --if-exists --no-owner --no-acl --exit-on-error --host="$PGHOST" --port="${PGPORT:-5432}" --username="$PGUSER" --dbname="$PGDATABASE" "$temporary_file"
echo "Restore completed into the explicitly selected isolated database."
