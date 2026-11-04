# Changelog

All notable changes to APIVault will be documented here.

The format is based on Keep a Changelog, and this project will use Semantic Versioning for stable releases.

## [0.1.0] - Unreleased

### Added
- Moderator inbox flags likely duplicate API submissions using normalized homepage URLs or matching provider/name pairs; hints remain advisory and never auto-reject submissions.
- API detail pages show catalogue review freshness, the next review due date, and a clear note distinguishing review metadata from live availability.
- Verification queue evidence checks now require official documentation, pricing, and authentication sources where applicable, and flag missing or older-than-180-day official source review timestamps.
- One-command local setup script that creates a local environment, generates a local-only auth secret, starts PostgreSQL, applies migrations, and seeds starter categories.
- Contributor quickstart, architecture diagrams, and a staged 0.2.0–0.5.0 delivery roadmap with explicit acceptance gates.
- Optional read-only API keys with hash-only storage, expiry, revocation, last-used tracking, and per-key throttling while preserving anonymous access.
- Private account key management, opt-in public contributor profiles, authenticated API submissions, and contributor submission history.
- Developer documentation, live API playground, and a served OpenAPI document.
- PostgreSQL backup/restore scripts, operations runbook, and scheduled/manual uptime smoke-check workflow.
- Additional curated API records supplied as a review-only dataset; imports remain pending maintainer verification.

### Security
- Add production HSTS and an initial report-only Content Security Policy for observation before enforcement.

## [0.0.1] - 2026-11-03

### Added
- PostgreSQL-backed fixed-window rate limiting for all public v1 REST endpoints, with atomic cross-instance updates, hashed client identifiers, 429 responses, retry guidance, and opportunistic bucket cleanup.
- Unit and PostgreSQL concurrency integration coverage for API rate-limit enforcement and window resets.
- Enable the initial v0.0.1 release tag to pass stable-branch ancestry validation and publish a multi-platform GHCR image.
- Add tag-driven GitHub Releases with stable-branch ancestry, package-version, and changelog validation.
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
