# Testing APIVault

## Current automated coverage

The repository uses Node.js's built-in test runner with TypeScript execution provided by the existing `tsx` development dependency. Tests live in `tests/unit/` and use the `*.test.ts` naming convention.

Run the unit suite with:

```bash
npm test
```

The initial unit suite covers catalogue query parameter parsing, admin API input validation, and community API submission validation. These are unit tests; they do not replace database integration, authorization, or browser-based end-to-end tests.

## Continuous integration

Application CI runs the unit test suite after Prisma client generation and before lint, type checking, and the production build.

## Test strategy

1. **Database integration:** transactions, relation updates, rollback, uniqueness constraints, approval/rejection, and immutable revision snapshots against isolated PostgreSQL.
2. **Authentication and authorization:** prove unauthenticated and non-admin users cannot access admin pages, data, or server actions.
3. **Workflow integration:** submission approval/rejection and API verification/publication invariants.
4. **Browser E2E:** sign-in, API creation/editing, verification, moderation, and revision history in a disposable environment.

Never point automated tests at production. Use isolated test credentials and disposable test data. Add or update tests in the same PR as the behavior they cover.
