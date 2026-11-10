# Hosted database migration startup

The hosted Render web service applies Prisma migrations before starting Next.js.
Prisma uses a PostgreSQL advisory lock to prevent concurrent migration runners
from applying schema changes simultaneously.

Render can briefly overlap instances during a deployment. If another migration
runner holds the advisory lock, Prisma reports `P1002`. The hosted startup now
uses `npm run db:deploy:retry`, which retries only advisory-lock timeouts with
a bounded linear backoff (five attempts by default). Other migration errors
fail immediately; the application never starts after an unsuccessful migration.

The retry policy is configurable with:
- `PRISMA_MIGRATE_MAX_ATTEMPTS` (default: `5`)
- `PRISMA_MIGRATE_RETRY_DELAY_SECONDS` (default: `10`)

Migrations should use the direct Neon connection. Keep Render's `DIRECT_URL`
set to the Neon unpooled connection string; `prisma.config.ts` prefers
`DATABASE_URL_UNPOOLED`, then `DIRECT_URL`, and only falls back to
`DATABASE_URL` for local environments.

This is a bounded mitigation for transient deploy overlap, not a substitute
for a dedicated migration job if the service is later moved to multi-instance
or multi-region deployment. Do not disable Prisma advisory locking.
