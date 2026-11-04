#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'APIVault setup: %s\n' "$1" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "Node.js 24.x is required. Install it and rerun this script."
command -v npm >/dev/null 2>&1 || fail "npm is required."
command -v go >/dev/null 2>&1 || fail "Go 1.25 or newer is required for APIVault. Install Go and rerun this script."
command -v docker >/dev/null 2>&1 || fail "Docker with the Compose plugin is required."
node -e 'const major = Number(process.versions.node.split(".")[0]); if (major !== 24) process.exit(1)' || fail "This project requires Node.js 24.x; found $(node --version)."
go_version="$(go env GOVERSION | sed 's/^go//')"
go_major="${go_version%%.*}"
go_minor="${go_version#*.}"
go_minor="${go_minor%%.*}"
if (( go_major < 1 || (go_major == 1 && go_minor < 25) )); then
  fail "APIVault requires Go 1.25 or newer; found $(go version)."
fi
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required. Start or install Docker Desktop / Docker Engine."
docker info >/dev/null 2>&1 || fail "The Docker daemon is not running. Start Docker Desktop / Docker Engine and retry."

if [[ ! -f .env ]]; then
  cp .env.example .env
  printf 'Created .env from .env.example. Review the local-only values before continuing.\n'
fi

node --input-type=module <<'NODE'
import { randomBytes } from "node:crypto";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
const path = ".env";
const contents = readFileSync(path, "utf8");
const match = contents.match(/^BETTER_AUTH_SECRET=(.*)$/m);
if (!match) throw new Error("BETTER_AUTH_SECRET entry is missing from .env");
const configured = match[1].trim().replace(/^["']|["']$/g, "").trim();
if (!configured) {
  const secret = randomBytes(32).toString("base64url");
  const updated = contents.replace(/^BETTER_AUTH_SECRET=.*$/m, `BETTER_AUTH_SECRET="${secret}"`);
  writeFileSync(path, updated, { mode: 0o600 });
  chmodSync(path, 0o600);
  console.log("Generated a unique local Better Auth secret in .env.");
}
NODE

printf '\n[1/6] Installing locked dependencies...\n'
npm ci

printf '\n[2/6] Starting PostgreSQL...\n'
docker compose up -d postgres

printf 'Waiting for PostgreSQL health'
ready=0
for _ in $(seq 1 30); do
  if docker compose exec -T postgres sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
    ready=1
    break
  fi
  printf '.'
  sleep 2
done
printf '\n'
[[ "$ready" -eq 1 ]] || fail "PostgreSQL did not become ready. Inspect with: docker compose logs postgres"

printf '\n[3/6] Verifying required Go services...\n'
npm run verify:go

printf '\n[4/6] Generating Prisma Client...\n'
npm run db:generate

printf '\n[5/6] Applying database migrations...\n'
npm run db:deploy

printf '\n[6/6] Seeding the starter category taxonomy...\n'
npm run db:seed

cat <<'EOF'

APIVault local database and dependencies are ready.

Next:
  npm run dev

Then open:
  http://localhost:3000

The seed creates categories only; it does not create API listings or an administrator.
To use the protected admin console, follow docs/ADMIN_SETUP.md.
Your .env contains local credentials and must never be committed.
EOF
