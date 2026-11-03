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
| Background worker | Go 1.25 | Concurrent external API homepage checks through authenticated internal endpoints |
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
- `src/lib/api-rate-limit.ts`: shared PostgreSQL fixed-window limiter; client IPs are SHA-256 hashed before persistence.
- `prisma/`: canonical database schema, migrations, and seed data.
- `tests/unit/`, `tests/integration/`, `tests/e2e/`, and `services/verifier/`: policy/validation tests, PostgreSQL-backed persistence tests, Playwright browser workflows, and the independent Go health-check worker.
- `docs/`: product and engineering decisions.

## HTTP security headers

Next.js applies baseline response headers globally: MIME sniffing is disabled, framing is denied, referrer information is restricted to the origin on cross-origin requests, and camera, microphone, and geolocation browser permissions are disabled. These defaults do not replace a future Content Security Policy, transport-security configuration at the hosting edge, or application-specific security review.

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

Responses contain only active, verified catalogue entries. The routes are versioned, apply bounded pagination, and use explicit serializers. The OpenAPI 3.1 contract is published at [openapi.json](openapi.json). All public routes enforce a shared PostgreSQL fixed-window limit of 120 requests per client IP per 60 seconds. Atomic upserts keep decisions consistent across application instances. Client IPs are SHA-256 hashed before storage; the reverse proxy must set a trustworthy X-Real-IP header. Rejected requests receive HTTP 429, Retry-After, and X-RateLimit headers. If the limiter database operation fails, requests fail closed with HTTP 503. Expired buckets are opportunistically cleaned. API responses include ETags and cache directives, and clients should follow the [public API usage policy](API_USAGE_POLICY.md). Route handlers emit structured completion/error logs with a validated or generated X-Request-Id for request correlation. A token-protected `/api/ops/metrics` endpoint exposes Prometheus text metrics for per-process request counts, cumulative durations, process uptime, and memory. Set `APIVAULT_METRICS_TOKEN` to a random secret of at least 32 characters and scrape the endpoint with an Authorization Bearer token. Counters are process-local and reset on restart; they are not aggregated across replicas or durable, and this endpoint is not a substitute for centralized monitoring or distributed tracing.

## Admin catalogue lifecycle

Admin API creation and editing use server-side Zod validation and database transactions. Creation starts in `PENDING_REVIEW`; ordinary edits preserve verification state. Explicit lifecycle actions control availability and verification. An API is publicly discoverable only when both its status is `ACTIVE` and verification status is `VERIFIED`.

Verification is evidence-gated: the official homepage source must match the canonical homepage URL, and the API must have category and authentication classifications. Lifecycle changes and catalogue mutations create revision snapshots so maintainers can inspect prior states.

## Community submission moderation

Community CREATE and UPDATE proposals are stored separately from canonical API records. Admin review actions enforce the allowed status transitions server-side. Approval revalidates the stored JSON payload, resolves providers and categories, applies the change to the canonical record, writes an API revision, and marks the submission approved in one transaction.

Applying a community submission never directly publishes an API. New or materially updated records return to pending verification and must pass the independent verification process.

## Testing architecture

Unit tests use Node.js's built-in test runner through the existing `tsx` dependency. Coverage includes catalogue and submission validation, admin authorization guard placement, ETag and conditional-request parsing, OpenAPI contract checks, security headers, readiness policy, request correlation, and operational metrics. Application CI runs unit tests and PostgreSQL integration tests before lint, type checking, and build.

PostgreSQL integration tests cover catalogue persistence and visibility, transaction rollback, submission review transitions, CREATE and UPDATE approval, concurrent reviewer races, lifecycle verification/publication, and concurrent rate-limit consumption. Playwright browser tests cover unauthenticated admin denial, administrator sign-in, API creation, evidence-based verification/publication, and submission rejection. Authenticated non-admin session coverage remains an explicit gap; source-level authorization checks do not replace a real non-admin session test. See [TESTING.md](TESTING.md) for the current test strategy and local commands.

## Readiness endpoint

`GET /api/health/ready` performs a lightweight database query and returns HTTP 200 only when PostgreSQL is reachable; otherwise it returns HTTP 503 with a sanitized status. Responses are marked `Cache-Control: no-store`. This is a readiness signal for deployment health checks, not a liveness probe and not a substitute for application-level smoke tests.

## Go verifier worker

The optional Go verifier is a separate worker, not a replacement for Next.js route handlers or the catalogue domain layer. It obtains bounded health-check jobs and submits observations through authenticated internal Next.js endpoints. It has no direct database credentials and cannot change verification or publication state.

The `ApiHealthCheck` table stores timestamped reachability observations, HTTP status, latency, and bounded error details. Health checks are operational signals only; maintainer evidence review remains the sole path to VERIFIED and public publication. See [GO_VERIFIER.md](GO_VERIFIER.md) for its SSRF boundary, configuration, and operations.

## Deployment boundary

The project can run locally with Docker Compose and any PostgreSQL 18-compatible hosted service. Deployment provider, secrets management, backups, and production observability remain deployment decisions; no cloud vendor is assumed in the application code. No production deployment is implied by the current development workflow.


## Admin verifier health operations

The protected `/admin/health` route reads the latest five health observations for each non-archived API. It summarizes the latest unreachable check, any failure in the recent history, and observations that are older than 24 hours or missing. Error text, HTTP status, latency, and timestamps are displayed for maintainer investigation. These labels are operational signals only and never mutate catalogue availability, verification status, evidence, or publication state. See [GO_VERIFIER.md](GO_VERIFIER.md).
