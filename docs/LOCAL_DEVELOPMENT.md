# Local development

## Requirements

- Node.js 24.x LTS (see `.nvmrc`); Node 26 is not supported by the package engine range.
- Go 1.25 or newer (required for the verifier and catalogue-importer services).
- npm bundled with Node 24 (npm 10 or newer).
- For a first-time setup, follow the more detailed [SETUP.md](SETUP.md) guide.
- Docker Desktop or Docker Engine with Compose.
- Git.

## Fast path\n\nAfter installing Node.js 24.x, Go 1.25+, and Docker Compose, run this from the repository root:\n\n```bash\nnpm run setup:local\n```\n\nThe script requires and verifies Go, validates and tests both Go services, creates a local-only `.env` when absent, generates a local Better Auth secret, installs dependencies, starts PostgreSQL, applies migrations, and seeds categories. It is safe to rerun for dependency and database setup; it does not reset or delete the database volume. It does not provision an administrator or add API records.\n\nFor manual setup or troubleshooting, continue below.\n\n## 1. Clone and configure

```bash
git clone https://github.com/yyyuvvvraj/APIVault.git
cd APIVault
git switch dev
cp .env.example .env
```

## 2. Start PostgreSQL

```bash
docker compose up -d
docker compose ps
```

The local `POSTGRES_PASSWORD` and the password in `DATABASE_URL` must match. Use local-only credentials and keep `.env` untracked. See [SETUP.md](SETUP.md) for a complete example and troubleshooting.

## 3. Install dependencies and generate Prisma Client

```bash
npm ci
npm run db:generate
```

## 4. Create the database schema

```bash
npm run db:deploy
```

Commit the generated `prisma/migrations` directory with your schema changes. Do not edit an already-applied migration; create a new migration for follow-up changes.

## 5. Seed the initial category taxonomy

```bash
npm run db:seed
```

The seed script creates categories only. It intentionally does not insert unverified API listings.

## 6. Provision an administrator

Follow [ADMIN_SETUP.md](ADMIN_SETUP.md) to configure Better Auth and provision the first administrator. Public registration is disabled.

## 7. Run the application

```bash
npm run dev
```

Open http://localhost:3000. The catalogue starts empty until verified API entries are added. The admin console is available at http://localhost:3000/admin after administrator provisioning.

## Quality checks

Run the same checks used by CI, including Go:

```bash
npm run verify:go
npm test
npm run db:deploy
npm run test:integration
npm run lint
npm run typecheck
npm run build
```

See [TESTING.md](TESTING.md) for current coverage, test strategy, and known gaps. To run browser E2E locally, install Playwright with `npm install --no-save @playwright/test@1.56.1`, install Chromium with `npx playwright install chromium`, and run `npx playwright test` against a disposable seeded database. Unit tests do not replace database integration, authorization, or browser-based end-to-end tests.

## Go services (required toolchain; optional worker runtime)

Go is a required project language. Both Go services are formatted, tested, vetted, and built by `npm run verify:go` and mandatory GitHub Actions checks. The verifier worker runs separately; start it when homepage checks are needed. Configure `VERIFIER_SHARED_SECRET` (at least 32 random characters) and `APIVAULT_INTERNAL_URL` in `.env`, start Next.js and PostgreSQL, then run:

```bash
docker compose --profile workers up --build verifier
```

See [GO_VERIFIER.md](GO_VERIFIER.md) for security behavior and Go unit-test commands.

## Database tools

```bash
npm run db:studio
```

To stop the local database:

```bash
docker compose down
```

To remove the local database volume permanently (destructive; deletes local data):

```bash
docker compose down -v
```

## Contribution flow

- Create a short-lived branch from `dev`.
- Open code, test, and documentation changes as a pull request into `dev`.
- For API data proposals, use the in-app community submission workflow when available to your local admin setup; proposals are reviewed by an administrator before they affect the catalogue.
- Include official source URLs and evidence for catalogue facts.
- Update the relevant documentation in the same pull request whenever behaviour, configuration, schema, API contracts, or contributor workflows change.
