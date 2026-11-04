#!/usr/bin/env bash
set -Eeuo pipefail
base="${APIVAULT_BASE_URL:?Set APIVAULT_BASE_URL to the hosted APIVault origin}"
base="${base%/}"

for path in /api/health/ready /api/v1/categories /openapi.json; do
  echo "Checking $path"
  response="$(curl --fail --silent --show-error --location --max-time 20 "$base$path")"
  [[ -n "$response" ]] || { echo "Empty response from $path" >&2; exit 1; }
done

ready="$(curl --fail --silent --show-error --location --max-time 20 "$base/api/health/ready")"
grep -q '"status":"ready"' <<<"$ready" || { echo "Readiness response did not report ready." >&2; exit 1; }
echo "APIVault hosted smoke checks passed."
