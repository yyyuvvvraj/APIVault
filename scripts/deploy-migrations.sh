#!/usr/bin/env bash
set -Eeuo pipefail

# Render may briefly overlap old and new instances during a deploy. Prisma
# serializes migrations with a PostgreSQL advisory lock; retry only that
# transient lock timeout instead of failing the entire application startup.
max_attempts="${PRISMA_MIGRATE_MAX_ATTEMPTS:-5}"
delay_seconds="${PRISMA_MIGRATE_RETRY_DELAY_SECONDS:-10}"

if ! [[ "$max_attempts" =~ ^[1-9][0-9]*$ ]] || ! [[ "$delay_seconds" =~ ^[1-9][0-9]*$ ]]; then
  echo "Migration retry settings must be positive integers." >&2
  exit 2
fi

for ((attempt = 1; attempt <= max_attempts; attempt++)); do
  echo "Running Prisma migrations (attempt $attempt/$max_attempts)..."
  if output="$(npm run db:deploy 2>&1)"; then
    printf '%s\n' "$output"
    echo "Prisma migrations completed."
    exit 0
  else
    status=$?
    printf '%s\n' "$output" >&2

    if ! grep -Eiq 'P1002|advisory lock' <<<"$output"; then
      echo "Migration failed for a non-retryable reason; refusing to retry." >&2
      exit "$status"
    fi

    if (( attempt == max_attempts )); then
      echo "Prisma migration lock remained unavailable after $max_attempts attempts." >&2
      exit "$status"
    fi

    wait_seconds=$((delay_seconds * attempt))
    echo "Migration advisory lock is busy; retrying in ${wait_seconds}s." >&2
    sleep "$wait_seconds"
  fi
done
