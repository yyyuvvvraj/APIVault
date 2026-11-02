# APIVault application architecture

## Architecture decision

APIVault is a web application backed by one canonical PostgreSQL catalogue. The website and the public REST API read from the same application/domain layer and the same database records.

## Selected stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 24 LTS | Supported LTS line and broad ecosystem compatibility |
| Web framework | Next.js 16 App Router | Server-rendered discovery pages and integrated route handlers |
| UI | React 19 + TypeScript | Component model and end-to-end type safety |
| Styling | Tailwind CSS 4 | Fast, consistent responsive UI |
| Database | PostgreSQL 18 | Relational integrity, joins, indexing, and full-text search options |
| ORM | Prisma ORM 7 | Typed queries and versioned schema migrations |
| Validation | Zod 4 | Runtime validation at untrusted input boundaries |
| Authentication | Better Auth | Session-based authentication and administrator roles |
| Local database | Docker Compose | Repeatable PostgreSQL development environment |
| CI | GitHub Actions | Unit tests, lint, type-check, schema generation, and production build |

Prisma ORM 7 is intentionally selected instead of the Prisma 8 release candidate so the foundation uses a generally available ORM version. Prisma 7 requires a PostgreSQL driver adapter and an ESM project; this repository uses `@prisma/adapter-pg`.

## Logical architecture

```text
Browser
  |
  v
Next.js App Router
  |-- Public pages: home, API search, API details
  |-- Admin pages: dashboard, API management, verification, categories, submissions, history
  |-- Route handlers: /api/v1/*
  |-- Better Auth route handler and session client
  |
  v
Server-side application/domain layer
  |-- Catalogue query, filter parsing, and public serializers
  |-- Admin server actions with requireAdmin authorization
  |-- Submission validation and moderation state transitions
  |-- Verification and publication rules
  |
  v
Prisma Client + PostgreSQL driver adapter
  |
  v
PostgreSQL
  |-- Providers and APIs
  |-- Categories, tags, authentication methods
  |-- Sources, pricing plans, rate limits
  |-- Better Auth users, sessions, accounts, verification
  |-- Submissions and revision history
```

The browser never talks directly to PostgreSQL. Route handlers expose explicit public DTOs; do not return raw Prisma records.

## Application boundaries

- `src/app`: routes, layouts, pages, server actions, and HTTP route handlers.
- `src/components`: reusable presentation components.
- `src/lib/catalogue`: shared search, query, and serialization logic.
- `src/lib/validation`: Zod schemas for untrusted data.
- `src/lib/admin-auth.ts`: server-side administrator session and role enforcement.
- `src/lib/auth.ts` and `src/lib/auth-client.ts`: Better Auth server and client configuration.
- `src/lib/db.ts`: server-only Prisma client lifecycle.
- `prisma/`: canonical database schema, migrations, and seed data.
- `tests/unit/` and `tests/integration/`: isolated policy/validation tests and PostgreSQL-backed persistence tests.
- `docs/`: product and engineering decisions.

## Authentication and administrator authorization

Public registration is disabled. The initial administrator is provisioned through the documented Better Auth CLI workflow. The admin console layout checks the session and administrator role before rendering protected pages.

Every admin server action must independently call `requireAdmin()`; layout protection and UI visibility are not substitutes for action-level authorization. Validate all submitted values on the server. Never trust role values, identifiers, lifecycle states, or payloads supplied by the browser.

## Catalogue search and filtering

The initial implementation uses case-insensitive PostgreSQL substring matching over API name, summary, description, provider name, and tags, with relational filters for category, price model, and authentication method.

When catalogue volume or latency justifies it, introduce a measured search upgrade:
1. PostgreSQL full-text search with a weighted `tsvector` index for name, summary, and description.
2. Trigram indexes for typo-tolerant matching.
3. Relevance ranking and query analytics.
4. A dedicated search service only if PostgreSQL is no longer sufficient.

Do not add Elasticsearch or another service before measurement demonstrates a need.

## Public REST API

The current read-only routes are:

- `GET /api/v1/apis`
- `GET /api/v1/apis/{slug}`
- `GET /api/v1/categories`

Responses contain only active, verified catalogue entries. The routes are versioned, apply bounded pagination, and use explicit serializers. Before declaring a public production API, add and publish an OpenAPI document, stable error contract, request limits, rate limiting, observability, and a published usage policy.

## Admin catalogue lifecycle

Admin API creation and editing use server-side Zod validation and database transactions. Creation starts in `PENDING_REVIEW`; ordinary edits preserve verification state. Explicit lifecycle actions control availability and verification. An API is publicly discoverable only when both its status is `ACTIVE` and verification status is `VERIFIED`.

Verification is evidence-gated: the official homepage source must match the canonical homepage URL, and the API must have category and authentication classifications. Lifecycle changes and catalogue mutations create revision snapshots so maintainers can inspect prior states.

## Community submission moderation

Community CREATE and UPDATE proposals are stored separately from canonical API records. Admin review actions enforce the allowed status transitions server-side. Approval revalidates the stored JSON payload, resolves providers and categories, applies the change to the canonical record, writes an API revision, and marks the submission approved in one transaction.

Applying a community submission never directly publishes an API. New or materially updated records return to pending verification and must pass the independent verification process.

## Testing architecture

Unit tests use Node.js's built-in test runner through the existing `tsx` dependency. The initial suite covers catalogue filter parsing and the Zod schemas used by admin API creation and community submissions. Application CI runs `npm test` before lint, type checking, and build.

Database transaction tests, authorization tests, and browser-based end-to-end tests remain explicit coverage gaps. See [TESTING.md](TESTING.md) for the test strategy and local commands.

## Deployment boundary

The project can run locally with Docker Compose and any PostgreSQL 18-compatible hosted service. Deployment provider, secrets management, backups, and production observability remain deployment decisions; no cloud vendor is assumed in the application code. No production deployment is implied by the current development workflow.
