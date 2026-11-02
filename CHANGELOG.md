# Changelog

All notable changes to APIVault will be documented here.

The format is based on Keep a Changelog, and this project will use Semantic Versioning for stable releases.

## [Unreleased]

### Added
- Optional Go API homepage verifier worker with authenticated internal job/result endpoints, SSRF protections, health-check history, and Alpine container image.
- PostgreSQL integration coverage for verifier health observation persistence and the invariant that health checks do not verify or publish catalogue entries.
- Verification and publication integration tests for official homepage evidence, category/auth requirements, revision history, and stale-evidence unpublishing.
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
