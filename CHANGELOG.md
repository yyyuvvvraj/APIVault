# Changelog

All notable changes to APIVault will be documented here.

The format is based on Keep a Changelog, and this project will use Semantic Versioning for stable releases.

## [Unreleased]

### Fixed
- Prevent concurrent submission reviewers from overwriting a newer moderation decision using status-conditional updates.
- Align every Next.js Docker build and runtime stage with the supported Node.js 24 engine range.
- Make the PostgreSQL Compose healthcheck use the configured database user and database name instead of hard-coded defaults.

### Fixed
- Clear the previous verification timestamp when an approved community UPDATE returns an API to pending verification.

### Added
- Enable the initial `v0.0.1` release tag to pass stable-branch ancestry validation and publish a multi-platform GHCR image.
- Run application, browser E2E, Docker smoke-test, and repository-hygiene workflows for pull requests targeting any branch, including stacked PR bases.
- Database-backed `/api/health/ready` endpoint with sanitized 200/503 responses and unit coverage for healthy and unavailable database states.
- Global baseline HTTP security headers for MIME sniffing, framing, referrer policy, and unused browser permissions, with automated configuration tests.
- OpenAPI 3.1 JSON contract for the public v1 API routes, query parameters, pagination, and error responses.
- Weekly Dependabot monitoring for npm, Go modules, Docker images, and GitHub Actions, with grouped npm update pull requests.
- Admin verifier health page with recent per-API check history, failure details, and stale-observation warnings; health observations remain separate from verification and publication decisions.
- GitHub Actions Go verifier checks for gofmt formatting, race-enabled tests, go vet, Linux binary compilation, and Alpine container smoke testing.
- Optional Go API homepage verifier worker with authenticated internal job/result endpoints, SSRF protections, health-check history, and Alpine container image.
- PostgreSQL integration coverage for verifier health observation persistence and the invariant that health checks do not verify or publish catalogue entries.
- Playwright Chromium browser tests and a dedicated CI workflow for admin login, protected-route access, API creation/verification/publication, and submission moderation.
- PostgreSQL integration coverage for submission rejection, invalid state transitions, atomic CREATE approval, evidence/revision persistence, and approval rollback.
- Shared submission review and approval services so server actions and integration tests exercise the same transaction logic.
- PostgreSQL-backed integration tests for catalogue persistence, public visibility rules, and transaction rollback.
- Administrator role-policy tests using the server-side authorization helper.
- Initial repository governance, contribution documentation, issue and pull request templates, MIT license, and automated repository hygiene checks.
- Initial Next.js application scaffold, PostgreSQL / Prisma canonical catalogue, category seed, and local Docker environment.
- Public catalogue browsing, search, filtering, API detail pages, and read-only versioned REST routes.
- Better Auth administrator sign-in with public registration disabled and protected admin console.
- Admin API creation and editing with server-side validation and revision snapshots.
- Evidence-gated API verification, availability controls, and publication lifecycle.
- Category create, edit, and safe deletion workflows.
- Community submission review, approval, transactional catalogue application, and revision history.
- Documentation for admin setup, architecture, local development, verification policy, and contribution workflow.

### Changed
- Require relevant documentation updates in the same pull request as implementation changes.
