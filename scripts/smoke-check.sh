#!/usr/bin/env bash
set -Eeuo pipefail

base="${APIVAULT_BASE_URL:?Set APIVAULT_BASE_URL to the hosted APIVault origin}"
base="${base%/}"

# Render Free instances may need time to resume after inactivity. Retry transient
# connection failures/timeouts, but fail immediately on HTTP errors and bad payloads.
request() {
  local path="$1"
  local response_file
  response_file="$(mktemp)"
  local attempt=1
  local max_attempts=4
  local delay=10

  while (( attempt <= max_attempts )); do
    echo "Checking $path (attempt $attempt/$max_attempts)"
    if curl --fail --silent --show-error --location \
      --connect-timeout 10 --max-time 45 \
      --output "$response_file" "$base$path"; then
      if [[ ! -s "$response_file" ]]; then
        echo "Empty response from $path" >&2
        rm -f "$response_file"
        return 1
      fi
      cat "$response_file"
      rm -f "$response_file"
      return 0
    else
      status=$?
      if (( attempt == max_attempts )); then
        echo "Request failed for $path after $max_attempts attempts (curl exit $status)." >&2
        rm -f "$response_file"
        return "$status"
      fi
      echo "Transient request failure for $path (curl exit $status); retrying in ${delay}s..." >&2
      sleep "$delay"
      delay=$((delay * 2))
      attempt=$((attempt + 1))
    fi
  done
}

request /api/health/ready > /tmp/apivault-ready.json
request /api/v1/categories > /tmp/apivault-categories.json
request /openapi.json > /tmp/apivault-openapi.json

grep -q '"status"[[:space:]]*:[[:space:]]*"ready"' /tmp/apivault-ready.json || {
  echo "Readiness response did not report ready." >&2
  cat /tmp/apivault-ready.json >&2
  exit 1
}

echo "APIVault hosted smoke checks passed."
