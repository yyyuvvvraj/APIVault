# Testing APIVault

## Current automated coverage

The repository uses Node.js's built-in test runner with TypeScript execution provided by the existing `tsx` development dependency. Tests live in `tests/unit/` and use the `*.test.ts` naming convention.

Run the unit suite with:

```bash
npm test
```

The initial unit suite covers:

- Catalogue query parameter parsing, normalization, enum allow-lists, and pagination bounds.
- Admin API input validation, including URL protocols, required categories, duplicate categories, and authentication classification rules.
- Community API submission validation, including evidence URL requirements and contributor handle validation.

These are unit tests. They do not replace database integration tests, authorization tests, or browser-based end-to-end tests.

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
