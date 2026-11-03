# Testing APIVault

## Current automated coverage

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

Coverage currently includes catalogue filter parsing, admin API and community submission validation, administrator role policy, database relation persistence, public visibility filtering, transaction rollback, submission review transitions, rejection persistence, atomic CREATE-submission approval, and a source-level guard requiring every current admin server-action module to authorize before processing form input or accessing the database.

## Administrator authorization coverage

`tests/unit/admin-action-authorization.test.ts` checks the admin server-action modules for the shared `requireAdmin()` guard and verifies it appears before form-data reads or database access. This is a regression guard against accidentally omitting the guard when adding a new action module; update its explicit module list whenever a new admin server-action module is introduced.

The source-level check does not simulate Better Auth cookies, sessions, or a non-admin account. Browser E2E currently covers unauthenticated route denial and administrator sign-in. Real authenticated non-admin session coverage remains an explicit follow-up.

## Submission workflow tests

The submission review service is shared by the server action and integration tests. Tests cover allowed and forbidden state transitions, required reviewer notes, rejection persistence, and transaction rollback.

The approval service is also shared by the server action and integration tests. CREATE approval is verified to apply the canonical API, official homepage evidence, revision snapshot, and APPROVED status in one transaction. The API remains pending verification and unpublished. A missing-category failure verifies that provider creation and submission changes roll back. UPDATE approval is covered for payload application, relation replacement, official homepage evidence, revision snapshots, and reset to pending verification. Concurrent reviewer races remain an additional coverage target.

## Verification and publication tests

The lifecycle service is shared by the admin server action and PostgreSQL integration tests. Tests cover matching official homepage evidence, required category and authentication metadata, successful verification timestamps, revision creation, publication, and unpublishing when verification becomes stale. Public detail lookup is checked before and after the lifecycle change.

## Browser end-to-end tests

Playwright tests live in `tests/e2e/` and use Chromium. Install the browser tooling locally when needed:

```bash
npm install --no-save @playwright/test@1.56.1
npx playwright install chromium
npx playwright test
```

The dedicated Browser E2E workflow provisions an isolated PostgreSQL database, applies migrations, seeds a disposable administrator and submission fixture, builds and starts the app, then exercises unauthenticated admin denial, administrator sign-in, API creation, evidence-based verification/publication, and submission rejection. Credentials are test-only CI values and must never be reused outside disposable environments.

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

Application CI provisions a disposable PostgreSQL 18 service, applies committed migrations, runs unit tests and database integration tests, then runs lint, type checking, and the production build. Never run these tests against production.

## Pull request expectations

Add or update tests and documentation in the same pull request as the behaviour they cover. If a change cannot reasonably be tested, explain why and record the remaining risk.

## Verifier health administration

The protected `/admin/health` page reads the latest five persisted observations for each non-archived API. It flags a latest failed observation as unreachable and flags missing or older-than-24-hour observations as stale. These are read-only operational indicators; they must not alter verification or publication state. The existing `verifier-health-check.test.ts` integration test verifies that health observations persist independently of verification and publication fields.

The Go Verifier CI workflow checks `gofmt -l .`, runs `go test -race -cover ./...`, runs `go vet ./...`, builds the Linux binary, and builds and smoke-tests the Alpine worker image.
