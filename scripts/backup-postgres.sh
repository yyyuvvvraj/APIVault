#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${PGHOST:?Set PGHOST to the PostgreSQL host}"
: "${PGUSER:?Set PGUSER to the backup database user}"
: "${PGDATABASE:?Set PGDATABASE to the database name}"
: "${PGPASSFILE:?Set PGPASSFILE to a permission-restricted PostgreSQL passfile}"
: "${BACKUP_ENCRYPTION_RECIPIENT:?Set BACKUP_ENCRYPTION_RECIPIENT to an age public recipient}"

if ! command -v pg_dump >/dev/null 2>&1 || ! command -v age >/dev/null 2>&1; then
  echo "pg_dump and age must be installed." >&2
  exit 1
fi

backup_dir="${BACKUP_DIR:-./backups}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"
[[ "$retention_days" =~ ^[0-9]+$ ]] || { echo "BACKUP_RETENTION_DAYS must be a non-negative integer." >&2; exit 1; }
mkdir -p "$backup_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
temporary_file="$(mktemp "${TMPDIR:-/tmp}/apivault-backup.XXXXXX")"
encrypted_file="$backup_dir/apivault-${timestamp}.dump.age"
cleanup() { rm -f "$temporary_file"; }
trap cleanup EXIT

export PGSSLMODE="${PGSSLMODE:-require}"
pg_dump --format=custom --no-owner --no-acl --file="$temporary_file" --host="$PGHOST" --port="${PGPORT:-5432}" --username="$PGUSER" --dbname="$PGDATABASE"
age --recipient "$BACKUP_ENCRYPTION_RECIPIENT" --output "$encrypted_file" "$temporary_file"
chmod 600 "$encrypted_file"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$encrypted_file"
else
  shasum -a 256 "$encrypted_file"
fi

find "$backup_dir" -type f -name 'apivault-*.dump.age' -mtime "+$retention_days" -delete
echo "Encrypted backup created: $encrypted_file"
