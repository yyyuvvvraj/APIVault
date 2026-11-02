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

Coverage currently includes catalogue filter parsing, admin API and community submission validation, administrator role policy, database relation persistence, public visibility filtering, transaction rollback, submission review transitions, rejection persistence, and atomic CREATE-submission approval.

## Submission workflow tests

The submission review service is shared by the server action and integration tests. Tests cover allowed and forbidden state transitions, required reviewer notes, rejection persistence, and transaction rollback.

The approval service is also shared by the server action and integration tests. CREATE approval is verified to apply the canonical API, official homepage evidence, revision snapshot, and APPROVED status in one transaction. The API remains pending verification and unpublished. A missing-category failure verifies that provider creation and submission changes roll back. UPDATE approval, concurrent reviewer races, and real Better Auth session authorization remain additional coverage targets.

## Continuous integration

Application CI provisions a disposable PostgreSQL 18 service, applies committed migrations, runs unit tests and database integration tests, then runs lint, type checking, and the production build. Never run these tests against production.

## Browser end-to-end strategy

Browser tests will exercise real sign-in, role-based route protection, API lifecycle, and submission moderation using a disposable test environment. See future E2E configuration before treating browser coverage as complete.

## Pull request expectations

Add or update tests and documentation in the same pull request as the behaviour they cover. If a change cannot reasonably be tested, explain why and record the remaining risk.
