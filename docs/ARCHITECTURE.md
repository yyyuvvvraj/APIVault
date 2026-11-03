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

Prisma ORM 7 uses the PostgreSQL driver adapter and an ESM project through @prisma/adapter-pg.

## Logical architecture
```text
Browser
  |
  v
Next.js App Router
  |-- Public pages and admin console
  |-- Versioned REST route handlers
  |-- Better Auth route handler and session client
  |
  v
Server-side application/domain layer
  |-- Catalogue query, filter parsing, and public serializers
  |-- Admin server actions with requireAdmin authorization
  |-- Submission validation and moderation state transitions
  |-- Verification and publication rules
  |-- PostgreSQL-backed public API rate limiter
  |
  v
Prisma Client + PostgreSQL driver adapter
  |
  v
PostgreSQL
  |-- Catalogue, users, sessions, submissions, and revisions
  |-- Atomic API rate-limit buckets
```

The browser never talks directly to PostgreSQL. Route handlers expose explicit public DTOs; do not return raw Prisma records.

## Application boundaries
- src/app: routes, layouts, pages, server actions, and HTTP route handlers.
- src/components: reusable presentation components.
- src/lib/catalogue: shared search, query, and serialization logic.
- src/lib/validation: Zod schemas for untrusted data.
- src/lib/admin-auth.ts: server-side administrator session and role enforcement.
- src/lib/db.ts: server-only Prisma client lifecycle.
- src/lib/api-rate-limit.ts: shared PostgreSQL fixed-window limiter; client IPs are SHA-256 hashed before persistence.
- prisma/: canonical database schema, migrations, and seed data.
- tests/unit, tests/integration, tests/e2e, and services/verifier: validation, PostgreSQL persistence, browser workflows, and the independent Go worker.
- docs/: product and engineering decisions.

## HTTP security headers
Next.js applies baseline response headers globally: MIME sniffing is disabled, framing is denied, referrer information is restricted to the origin on cross-origin requests, and camera, microphone, and geolocation browser permissions are disabled. These defaults do not replace a future Content Security Policy, transport-security configuration at the hosting edge, or application-specific security review.

## Authentication and administrator authorization
Public registration is disabled. The initial administrator is provisioned through the documented Better Auth CLI workflow. The admin console layout checks the session and administrator role before rendering protected pages. Every admin server action must independently call requireAdmin(); layout protection and UI visibility are not substitutes for action-level authorization.

## Catalogue search and filtering
The initial implementation uses case-insensitive PostgreSQL substring matching over API name, summary, description, provider name, and tags, with relational filters for category, price model, and authentication method. Prefer measured PostgreSQL full-text and trigram indexes before introducing a dedicated search service.

## Public REST API
The read-only routes are GET /api/v1/apis, GET /api/v1/apis/{slug}, and GET /api/v1/categories. Responses contain only active, verified catalogue entries, use explicit serializers, and are described by the OpenAPI 3.1 contract at openapi.json.

All public routes enforce a shared fixed-window limit of 120 requests per client IP per 60 seconds. PostgreSQL atomic upserts keep decisions consistent across application instances. Client IPs are SHA-256 hashed before storage; the reverse proxy must set a trustworthy X-Real-IP header. Rejected requests receive HTTP 429, Retry-After, and X-RateLimit headers. If the limiter database operation fails, requests fail closed with HTTP 503. Expired buckets are opportunistically cleaned.

## Admin catalogue lifecycle
Admin API creation and editing use server-side Zod validation and database transactions. Creation starts in PENDING_REVIEW; ordinary edits preserve verification state. An API is publicly discoverable only when both its status is ACTIVE and verification status is VERIFIED. Verification is evidence-gated and lifecycle changes create revision snapshots.

## Community submission moderation
Community CREATE and UPDATE proposals are stored separately from canonical API records. Approval revalidates the stored JSON payload, applies the change, writes a revision, and marks the submission approved in one transaction. Applying a community submission never directly publishes an API.

## Testing architecture
Unit tests use Node.js's built-in test runner through tsx. PostgreSQL integration tests cover catalogue persistence, submission workflows, concurrent-reviewer protection, and atomic API rate-limit consumption. See TESTING.md for current commands and coverage.

## Readiness endpoint
GET /api/health/ready performs a lightweight database query and returns HTTP 200 only when PostgreSQL is reachable; otherwise it returns HTTP 503 with a sanitized status. This is a readiness signal, not a liveness probe.

## Go verifier worker
The optional Go verifier is a separate worker with authenticated internal job/result endpoints and SSRF protections. It has no direct database credentials and cannot change verification or publication state. Health observations remain operational signals only.

## Deployment boundary
The project can run locally with Docker Compose and any PostgreSQL 18-compatible hosted service. Deployment provider, secrets management, backups, and production observability remain deployment decisions. No production deployment is implied by the current development workflow.
