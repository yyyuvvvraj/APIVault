# Testing APIVault

## Automated coverage

The repository uses Node.js's built-in test runner with TypeScript execution provided by the existing `tsx` dependency.

Run unit tests:

```bash
npm test
```

Run PostgreSQL-backed integration tests against a disposable database after applying migrations:

```bash
npm run db:deploy
npm run test:integration
```

Coverage includes OpenAPI contract parsing and route presence, catalogue filter parsing, admin API and community submission validation, administrator role policy, database relation persistence, public visibility filtering, transaction rollback, submission review transitions, concurrent-reviewer compare-and-set protection, rejection persistence, atomic submission approval, PostgreSQL-backed concurrent rate-limit consumption and window resets, client-IP hashing, rate-limit headers, ETags, and a source-level guard requiring admin authorization before server actions process form input or access the database.

## Administrator authorization

`tests/unit/admin-action-authorization.test.ts` checks that every current admin server-action module invokes the shared `requireAdmin()` guard before reading form data or accessing the database. Update its explicit module list whenever a new admin server-action module is introduced.

Playwright browser E2E also provisions a disposable standard user with no admin role. It verifies that the authenticated non-admin account is denied access to protected admin pages, in addition to testing unauthenticated denial and administrator sign-in. These browser tests exercise real Better Auth sessions; they complement rather than replace the source-level guard.

## Submission and publication workflows

The submission review service is shared by the server action and integration tests. Tests cover allowed and forbidden state transitions, required reviewer notes, rejection persistence, and transaction rollback.

The approval service is tested for CREATE and UPDATE payload application, official homepage evidence, relation replacement, revision snapshots, pending-verification reset, and transactional rollback. Concurrent reviewer races are covered with competing PostgreSQL transactions; exactly one decision may commit.

The lifecycle service is tested for matching official homepage evidence, required category and authentication metadata, verification timestamps, revision creation, publication, and unpublishing when verification becomes stale. Public detail lookup is checked before and after lifecycle changes.

## API rate limiting and HTTP caching

Unit tests cover reverse-proxy client address extraction, one-way address hashing, rate-limit headers, ETag generation, and If-None-Match parsing including weak validators, wildcard requests, and commas inside quoted entity tags. OpenAPI contract tests require every public GET route to document its conditional request header, 304 response, and ETag header.

The PostgreSQL integration test races concurrent requests against a disposable database bucket and verifies that exactly the configured number are admitted, excess requests are rejected, and a new fixed window admits requests again. Run integration tests only against a disposable database.

## Browser end-to-end tests

Playwright tests live in `tests/e2e/` and use Chromium. Install the browser tooling locally when needed:

```bash
npm install --no-save @playwright/test@1.56.1
npx playwright install chromium
npx playwright test
```

The dedicated Browser E2E workflow provisions an isolated PostgreSQL database, applies migrations, seeds disposable administrator and ordinary-user credential accounts plus a submission fixture, builds and starts the app, then exercises unauthenticated admin denial, authenticated non-admin denial, administrator sign-in, API creation, evidence-based verification/publication, and submission rejection. Credentials are CI-only and must never be reused outside disposable environments.

## Operational readiness tests

The readiness policy is unit-tested with successful and failed database-check functions. The route runs a real `SELECT 1` against the configured PostgreSQL connection and does not expose connection details in its response.

## Go verifier tests

The independent worker uses Go's standard test runner and has no third-party Go module dependencies:

```bash
cd services/verifier
go test -race -cover ./...
go vet ./...
go build ./cmd/verifier
```

Tests cover unsafe URL rejection, standard-port restrictions, public/private IP classification, and the authenticated jobs/results contract. Go Verifier CI runs tests, vet, binary compilation, and an Alpine container build and smoke test.

## Continuous integration

Pull requests run Application CI, Browser E2E, Docker build/container smoke tests, and repository hygiene regardless of target branch. Application CI provisions a disposable PostgreSQL 18 service, applies committed migrations, runs unit and database integration tests, then runs lint, type checking, and the production build. Never run these tests against production.

## Pull request expectations

Add or update tests and documentation in the same pull request as the behaviour they cover. If a change cannot reasonably be tested, explain why and record the remaining risk.

## Verifier health administration

The protected `/admin/health` page reads the latest five persisted observations for each non-archived API. It flags a latest failed observation as unreachable and flags missing or older-than-24-hour observations as stale. These are read-only operational indicators; they must not alter verification or publication state. The `verifier-health-check.test.ts` integration test verifies that health observations persist independently of verification and publication fields.

The Go Verifier CI workflow checks `gofmt -l .`, runs `go test -race -cover ./...`, runs `go vet ./...`, builds the Linux binary, and builds and smoke-tests the Alpine worker image.
