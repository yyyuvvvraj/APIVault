# Changelog

All notable changes to APIVault will be documented here.

The format is based on Keep a Changelog, and this project will use Semantic Versioning for stable releases.

## [0.0.1] - 2026-11-03

### Added
- PostgreSQL-backed fixed-window rate limiting for all public v1 REST endpoints, with atomic cross-instance updates, hashed client identifiers, 429 responses, retry guidance, and opportunistic bucket cleanup.
- Unit and PostgreSQL concurrency integration coverage for API rate-limit enforcement and window resets.
- Enable the initial v0.0.1 release tag to pass stable-branch ancestry validation and publish a multi-platform GHCR image.
- Run application, browser E2E, Docker smoke-test, and repository-hygiene workflows for pull requests targeting any branch, including stacked PR bases.
- Database-backed /api/health/ready endpoint with sanitized 200/503 responses and unit coverage for healthy and unavailable database states.
- Global baseline HTTP security headers for MIME sniffing, framing, referrer policy, and unused browser permissions, with automated configuration tests.
- OpenAPI 3.1 JSON contract for the public v1 API routes, query parameters, pagination, and error responses.
- Weekly Dependabot monitoring for npm, Go modules, Docker images, and GitHub Actions, with grouped npm update pull requests.
- Admin verifier health page with recent per-API check history, failure details, and stale-observation warnings.
- Optional Go API homepage verifier worker with authenticated internal endpoints, SSRF protections, health-check history, and Alpine container image.
- Playwright Chromium browser tests and a dedicated CI workflow for admin login, protected-route access, API creation/verification/publication, and submission moderation.
- PostgreSQL-backed integration tests for catalogue persistence, public visibility rules, submission workflows, transaction rollback, and concurrent reviewer decisions.
- Initial Next.js application scaffold, PostgreSQL / Prisma canonical catalogue, category seed, and local Docker environment.
- Public catalogue browsing, search, filtering, API detail pages, and read-only versioned REST routes.
- Better Auth administrator sign-in with public registration disabled and protected admin console.
- Admin API lifecycle, evidence-gated verification, community submission moderation, and revision history.

### Fixed
- Prevent concurrent submission reviewers from overwriting a newer moderation decision using status-conditional updates.
- Align Docker build and runtime stages with the supported Node.js 24 engine range.
- Make the PostgreSQL Compose healthcheck use configured database credentials.
- Clear the previous verification timestamp when an approved community UPDATE returns an API to pending verification.

### Changed
- Require relevant documentation updates in the same pull request as implementation changes.
- Document PostgreSQL-backed rate limiting and the trusted reverse-proxy client IP requirement.
