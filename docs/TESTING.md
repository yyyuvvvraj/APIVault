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

Coverage includes an OpenAPI JSON parse and route-presence check for the published contract, catalogue filter parsing, admin API and community submission validation, administrator role policy, database relation persistence, public visibility filtering, transaction rollback, submission review transitions, concurrent-reviewer compare-and-set protection, rejection persistence, atomic CREATE-submission approval, PostgreSQL-backed concurrent API rate-limit consumption and window resets, client-IP hashing and rate-limit header formatting, and a source-level guard requiring every current admin server-action module to authorize before processing form input or accessing the database.

## API rate-limit tests

The unit suite covers reverse-proxy client address extraction, one-way address hashing, rate-limit headers, ETag generation, and If-None-Match parsing including weak validators, wildcard requests, and commas inside quoted entity tags. The OpenAPI contract tests require every public GET route to document its conditional request header, 304 response, and ETag response header. The PostgreSQL integration test races concurrent requests against a disposable database bucket and verifies that exactly the configured number are admitted, excess requests are rejected, and a new fixed window admits requests again. Run integration tests only against a disposable database.

## Administrator authorization coverage

`tests/unit/admin-action-authorization.test.ts` checks the admin server-action modules for the shared `requireAdmin()` guard and verifies it appears before form-data reads or database access. This is a regression guard against accidentally omitting the guard when adding a new action module; update its explicit module list whenever a new admin server-action module is introduced.

The source-level check is complemented by browser tests using real Better Auth sessions. A seeded standard user is denied access to protected admin pages. A separate E2E test captures a valid Server Action request from an administrator session, then replays that exact action request with the standard user's cookies. The action must redirect to the not-authorized login state, and a follow-up public category query confirms that the attempted category mutation did not occur. This exercises the direct Server Action boundary rather than relying only on protected-layout behavior.

## Submission workflow tests

The submission review service is shared by the server action and integration tests. Tests cover allowed and forbidden state transitions, required reviewer notes, rejection persistence, and transaction rollback.

The approval service is also shared by the server action and integration tests. CREATE approval is verified to apply the canonical API, official homepage evidence, revision snapshot, and APPROVED status in one transaction. The API remains pending verification and unpublished. A missing-category failure verifies that provider creation and submission changes roll back. UPDATE approval is covered for payload application, relation replacement, official homepage evidence, revision snapshots, and reset to pending verification. Concurrent reviewer races are covered with competing PostgreSQL transactions; exactly one decision may commit.

## Verification and publication tests

The lifecycle service is shared by the admin server action and PostgreSQL integration tests. Tests cover matching official homepage evidence, required category and authentication metadata, successful verification timestamps, revision creation, publication, and unpublishing when verification becomes stale. Public detail lookup is checked before and after the lifecycle change.

## Browser end-to-end tests

Playwright tests live in `tests/e2e/` and use Chromium. Install the browser tooling locally when needed:

```bash
npm install --no-save @playwright/test@1.56.1
npx playwright install chromium
npx playwright test
```

The dedicated Browser E2E workflow provisions an isolated PostgreSQL database, applies migrations, seeds disposable administrator and ordinary-user credential accounts plus isolated moderation/retry fixtures, builds and starts the app, then exercises unauthenticated admin denial, authenticated non-admin denial across protected admin pages, administrator API creation and evidence-based verification/publication, submission rejection, the complete moderation review/approval lifecycle, contributor API submission, and public-profile opt-in/opt-out privacy. Retry attempts use separate standard-user credentials and fixture records so a partially completed first attempt cannot poison a retry. Standard-user fixtures have no admin role and use CI-only password hashes created through Better Auth's password hasher. Credentials are test-only CI values and must never be reused outside disposable environments.
The dedicated Browser E2E workflow provisions an isolated PostgreSQL database, applies migrations, seeds disposable administrator and ordinary-user credential accounts plus a submission fixture, builds and starts the app, then exercises unauthenticated admin denial, authenticated non-admin denial across protected admin pages, administrator sign-in, API creation, evidence-based verification/publication, submission rejection, the complete moderation transition and approval lifecycle, and contributor submission, private submission tracking, and public-profile opt-in/opt-out. The standard-user fixture has no admin role and uses a CI-only password hash created through Better Auth's password hasher. Credentials are test-only CI values and must never be reused outside disposable environments.

## Operational readiness tests

The readiness policy is unit-tested with successful and failed database-check functions. The route itself runs a real `SELECT 1` against the configured PostgreSQL connection and does not expose connection details in its response.


## Go catalogue importer recovery tests

The migrated PostgreSQL integration test `TestImportResumablePostgresRecoveryAndConcurrency` covers same-run concurrency and recovery after an interrupted batch. It also forces a database-side category lookup failure, verifies that the failed batch's diagnostic survives the rolled-back transaction, creates the missing category, and retries the exact same manifest and run ID. The retry must complete the batch, clear its error summary, and complete the run. Application CI runs this test with Go's race detector.

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

Application, browser E2E, Docker smoke-test, and repository-hygiene workflows run for pull requests regardless of target branch. This keeps validation active for stacked feature branches.

Application CI provisions a disposable PostgreSQL 18 service, applies committed migrations, runs unit tests and database integration tests, then runs lint, type checking, and the production build. Never run these tests against production.

## Pull request expectations

Add or update tests and documentation in the same pull request as the behaviour they cover. If a change cannot reasonably be tested, explain why and record the remaining risk.

## Verifier health administration

The protected `/admin/health` page reads the latest five persisted observations for each non-archived API. It flags a latest failed observation as unreachable and flags missing or older-than-24-hour observations as stale. These are read-only operational indicators; they must not alter verification or publication state. The existing `verifier-health-check.test.ts` integration test verifies that health observations persist independently of verification and publication fields.

The Go Verifier CI workflow checks `gofmt -l .`, runs `go test -race -cover ./...`, runs `go vet ./...`, builds the Linux binary, and builds and smoke-tests the Alpine worker image.
