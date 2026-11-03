# Testing APIVault

## Current automated coverage

The repository uses Node.js's built-in test runner with TypeScript execution provided by the existing tsx dependency.

Run unit tests:

```bash
npm test
```

Run PostgreSQL-backed integration tests against a disposable database after applying migrations:

```bash
npm run db:deploy
npm run test:integration
```

Coverage includes catalogue filter parsing, admin API and community submission validation, administrator role policy, database relation persistence, public visibility filtering, transaction rollback, submission review transitions, concurrent-reviewer compare-and-set protection, rejection persistence, atomic CREATE-submission approval, PostgreSQL-backed concurrent API rate-limit consumption and window resets, client-IP hashing and rate-limit header formatting, OpenAPI contract validation, and the source-level admin authorization guard.

## API rate-limit tests

The unit suite covers reverse-proxy client address extraction, one-way address hashing, and rate-limit headers. The PostgreSQL integration test races concurrent requests against a disposable database bucket and verifies that exactly the configured number are admitted, excess requests are rejected, and a new fixed window admits requests again. Run integration tests only against a disposable database.

## Administrator authorization coverage

The source-level authorization check verifies that admin server-action modules call requireAdmin before reading form data or accessing the database. Update its explicit module list whenever a new admin server-action module is introduced.

The source-level check does not simulate Better Auth cookies, sessions, or a non-admin account. Browser E2E currently covers unauthenticated route denial and administrator sign-in. Real authenticated non-admin session coverage remains an explicit follow-up.

## Submission workflow tests

The submission review service is shared by the server action and integration tests. Tests cover allowed and forbidden state transitions, required reviewer notes, rejection persistence, and transaction rollback.

The approval service is also shared by the server action and integration tests. CREATE approval is verified to apply the canonical API, official homepage evidence, revision snapshot, and APPROVED status in one transaction. The API remains pending verification and unpublished. UPDATE approval is covered for payload application, relation replacement, official homepage evidence, revision snapshots, and reset to pending verification. Concurrent reviewer races are covered with competing PostgreSQL transactions; exactly one decision may commit.

## Verification and publication tests

The lifecycle service and PostgreSQL integration tests cover matching official homepage evidence, required category and authentication metadata, verification timestamps, revision creation, publication, and unpublishing when verification becomes stale.

## Browser end-to-end tests

Playwright tests live in tests/e2e and use Chromium. Install the browser tooling locally when needed:

```bash
npm install --no-save @playwright/test@1.56.1
npx playwright install chromium
npx playwright test
```

The dedicated Browser E2E workflow provisions an isolated PostgreSQL database, applies migrations, seeds a disposable administrator and submission fixture, builds and starts the app, then exercises unauthenticated admin denial, administrator sign-in, API creation, evidence-based verification/publication, and submission rejection. Credentials are test-only CI values and must never be reused outside disposable environments.

## Operational readiness tests

The readiness policy is unit-tested with successful and failed database-check functions. The route itself runs a real SELECT 1 against the configured PostgreSQL connection and does not expose connection details in its response.

## Go verifier tests

The independent worker uses Go's standard test runner and has no third-party Go module dependencies:

```bash
cd services/verifier
go test -race -cover ./...
go vet ./...
go build ./cmd/verifier
```

Tests cover unsafe URL rejection, standard-port restrictions, public/private IP classification, and the authenticated jobs/results contract.

## Continuous integration

Application, browser E2E, Docker smoke-test, and repository-hygiene workflows run for pull requests regardless of target branch. Application CI provisions a disposable PostgreSQL 18 service, applies committed migrations, runs unit tests and database integration tests, then runs lint, type checking, and the production build. Never run these tests against production.

## Pull request expectations

Add or update tests and documentation in the same pull request as the behaviour they cover. If a change cannot reasonably be tested, explain why and record the remaining risk.

## Verifier health administration

The protected admin health page reads the latest five persisted observations for each non-archived API. It flags a latest failed observation as unreachable and flags missing or older-than-24-hour observations as stale. These are read-only operational indicators; they must not alter verification or publication state.
