# Testing APIVault

## Current automated coverage

The repository uses Node.js's built-in test runner with TypeScript execution provided by the existing `tsx` development dependency. Tests live in `tests/unit/` and use the `*.test.ts` naming convention.

The unit suite also covers administrator role parsing through the same pure policy function used by the server-side authorization guard.

Run the unit suite with:

```bash
npm test
```

The initial unit suite covers:

- Catalogue query parameter parsing, normalization, enum allow-lists, and pagination bounds.
- Admin API input validation, including URL protocols, required categories, duplicate categories, and authentication classification rules.
- Community API submission validation, including evidence URL requirements and contributor handle validation.

These are unit tests. They do not replace database integration tests, authorization tests, or browser-based end-to-end tests.

## Database integration suite

Database tests live in `tests/integration/` and require a disposable PostgreSQL database with the committed Prisma migrations applied. Configure `DATABASE_URL` to point only at a test database, then run:

```bash
npm run db:deploy
npm run test:integration
```

The PostgreSQL suite also verifies persisted Go verifier health observations, cascade cleanup, and that a health observation does not alter verification or publication state. It verifies relational persistence, the public query boundary (only `ACTIVE + VERIFIED` records are returned), detail lookup visibility, and rollback of multiple writes when a transaction fails. CI provisions an ephemeral PostgreSQL service, applies migrations, and runs this suite. The tests use unique fixture slugs and clean up their records.

## Go verifier tests

The independent worker uses Go's standard test runner and has no third-party Go module dependencies:

```bash
cd services/verifier
go test -race -cover ./...
go vet ./...
go build ./cmd/verifier
```

Tests cover unsafe URL rejection, public/private IP classification, and the authenticated jobs/results contract. Go Verifier CI runs tests, vet, binary compilation, and an Alpine container build.

## Continuous integration

Application CI runs the unit test suite after Prisma client generation and before lint, type checking, and the production build. A pull request must pass the complete application validation workflow.

## Test strategy and gaps

Expand coverage in layers:

1. **Unit tests:** pure parsers, schemas, serializers, lifecycle transition helpers, and domain rules. Keep tests independent of PostgreSQL and external services where possible.
2. **Database integration tests:** verify transactions, relation updates, rollback behavior, uniqueness constraints, submission approval, and immutable revision snapshots against an isolated test database.
3. **Authorization tests:** prove that unauthenticated and non-admin users cannot invoke protected server actions or access admin data.
4. **End-to-end tests:** exercise sign-in, API creation/editing, verification, category management, submission moderation, and revision history in a disposable environment.

Never point automated tests at a production database. Use isolated test credentials and disposable test data. Do not commit secrets or real user information.

## Pull request expectations

Add or update tests in the same pull request as the behaviour they cover. If a change cannot reasonably be tested, explain why in the pull request and record the remaining risk.
