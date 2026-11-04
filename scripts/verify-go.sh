#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v go >/dev/null 2>&1 || { echo 'APIVault requires Go 1.25 or newer.' >&2; exit 1; }
go env GOVERSION | grep -Eq '^go(1\.(2[5-9]|[3-9][0-9])|[2-9])([.]|$)' || { echo "APIVault requires Go 1.25 or newer; found $(go version)." >&2; exit 1; }

for module in services/verifier services/catalogue-importer; do
  echo "==> Checking $module"
  unformatted="$(cd "$module" && gofmt -l .)"
  if [[ -n "$unformatted" ]]; then
    printf 'Go files need gofmt:\n%s\n' "$unformatted" >&2
    exit 1
  fi
  (cd "$module" && go test -race -cover ./...)
  (cd "$module" && go vet ./...)
done

echo '==> Building verifier'
(cd services/verifier && go build -trimpath -ldflags='-s -w' -o /tmp/apivault-verifier ./cmd/verifier)
echo '==> Validating curated catalogue and building importer'
(cd services/catalogue-importer && go run ./cmd/catalogue-importer -input data/curated-starter-v1.json)
(cd services/catalogue-importer && go run ./cmd/catalogue-importer -input data/curated-starter-v2.json)
(cd services/catalogue-importer && go build -trimpath -ldflags='-s -w' -o /tmp/apivault-catalogue-importer ./cmd/catalogue-importer)

echo 'All required Go services passed formatting, tests, vet, and build checks.'
