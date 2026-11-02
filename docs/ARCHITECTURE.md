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
| Local database | Docker Compose | Repeatable PostgreSQL development environment |
| CI | GitHub Actions | Lint, type-check, schema generation, and production build |

Prisma ORM 7 is intentionally selected instead of the Prisma 8 release candidate so the foundation uses a generally available ORM version. Prisma 7 requires a PostgreSQL driver adapter and an ESM project; this repository uses `@prisma/adapter-pg`.

## Logical architecture

```text
Browser
  |
  v
Next.js App Router
  |-- Public pages: home, API search, API details
  |-- Route handlers: /api/v1/*
  |
  v
Catalogue query / domain layer
  |-- Filter parsing
  |-- Verified-publication rules
  |-- Public response serializers
  |
  v
Prisma Client + PostgreSQL driver adapter
  |
  v
PostgreSQL
  |-- Providers and APIs
  |-- Categories, tags, authentication methods
  |-- Sources, pricing plans, rate limits
  |-- Submissions and revision history
```

The browser never talks directly to PostgreSQL. Route handlers expose explicit public DTOs; do not return raw Prisma records.

## Application boundaries

- `src/app`: routes, layouts, pages, and HTTP route handlers.
- `src/components`: reusable presentation components.
- `src/lib/catalogue`: shared search, query, and serialization logic.
- `src/lib/validation`: Zod schemas for untrusted data.
- `src/lib/db.ts`: server-only Prisma client lifecycle.
- `prisma/`: canonical database schema and seed data.
- `docs/`: product and engineering decisions.

## Search and filtering

The initial implementation uses case-insensitive PostgreSQL substring matching over API name, summary, description, provider name, and tags, with relational filters for category, price model, and authentication method.

When catalogue volume or latency justifies it, introduce a measured search upgrade:
1. PostgreSQL full-text search with a weighted `tsvector` index for name, summary, and description.
2. Trigram indexes for typo-tolerant matching.
3. Relevance ranking and query analytics.
4. A dedicated search service only if PostgreSQL is no longer sufficient.

Do not add Elasticsearch or another service before measurement demonstrates a need.

## Public REST API

The first read-only routes are:

- `GET /api/v1/apis`
- `GET /api/v1/apis/{slug}`
- `GET /api/v1/categories`

Responses contain only active, verified catalogue entries. The routes are versioned from day one, apply bounded pagination, and use explicit serializers. Before declaring a public production API, add an OpenAPI document, stable error contract, request limits, rate limiting, observability, and a published usage policy.

## Contribution and verification boundary

The first contribution path is a GitHub API-submission issue template. Maintainers review source evidence and merge catalogue changes through pull requests. The database includes submission and revision records so an authenticated in-app review queue can be introduced without changing the canonical API records.

Do not accept direct, unauthenticated write requests into the public catalogue. Authentication, anti-spam controls, moderation permissions, and an audit trail are prerequisites for in-app submissions.

## Deployment boundary

The project can run locally with Docker Compose and any PostgreSQL 18-compatible hosted service. Deployment provider, secrets management, backups, and production observability remain deployment decisions; no cloud vendor is assumed in the application code.
