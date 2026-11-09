# APIVault delivery roadmap

**Product promise:** The GitHub of APIs — discovery, verification and community.

This roadmap is an execution order, not a claim that future capabilities already exist. A milestone is complete only when its acceptance criteria are implemented, tested, documented, and merged into `dev`. A version tag is a separate release operation and must satisfy the repository's stable-branch ancestry checks.

## Current baseline

- **0.1.0 — Developer and contributor foundation:** API keys, OpenAPI reference/playground, contributor profiles and submissions, review-only catalogue expansion, backup/restore tooling, and initial operations checks. The implementation is present on `dev`; hosted validation and restore evidence remain open.
- **0.2.0 — Catalogue quality and discovery:** improve the quality and usefulness of the catalogue before optimizing for raw listing count.
- **0.3.0 — Developer platform:** make API integration easier to understand, test, and monitor.
- **0.4.0 — Community operations:** improve contributor workflows, moderation throughput, and transparent change history.
- **0.5.0 — Reliable beta and 1,000-API catalogue:** demonstrate a dependable, observable beta and deliver at least 1,000 distinct, evidence-backed catalogue APIs. This catalogue threshold is a release acceptance gate, not a stretch goal.
- **1.0.0 — General availability:** the first official GA release, only after every v1 release gate is evidenced and approved.

## 0.2.0 — Catalogue quality and discovery

### Deliverables
- A consistent metadata completeness policy for official documentation, homepage, authentication, pricing, rate limits, terms, status page, geography, and source evidence.
- A review queue that makes missing evidence and incomplete fields obvious to maintainers.
- Duplicate detection and import validation before records can enter the canonical catalogue.
- Better search relevance through all-term matching and weighted ranking across API names, providers, categories, tags, and descriptions; category, pricing, and authentication filters compose with AND semantics.
- Clear freshness and verification context on API detail pages.
- A reviewed starter catalogue; no imported record becomes public merely because it exists in a data file.

### Acceptance gates
- Unit and PostgreSQL integration tests prove that pending, unverified, archived, or incomplete records are not returned by public endpoints.
- Search tokenization, weighted ranking, and category + pricing + authentication filter combinations are covered by deterministic unit and PostgreSQL integration tests.
- Every published candidate has official source evidence; unknown facts remain explicitly unknown.
- No material search regression in the existing public API contract.

## 0.3.0 — Developer platform

### Deliverables
- Complete API reference examples for pagination, filtering, conditional requests, errors, and rate-limit handling.
- Playground usability improvements, including copyable cURL examples and visible request/response metadata.
- API-key lifecycle clarity: one-time secret handling, scope, expiry, revocation, and usage attribution.
- Stable SDK/example snippets only where they can be generated from and checked against the OpenAPI contract.
- A public changelog for API contract changes.

### Acceptance gates
- OpenAPI contract tests match every public route and documented response.
- Browser tests cover the full playground journey without exposing credentials.
- API-key integration tests cover ownership, expiry, revocation, and throttling.
- No write-capable public API key is introduced in this milestone.

## 0.4.0 — Catalogue growth and community operations

### Deliverables
- Improve contributor onboarding, submission guidance, source-evidence prompts, and duplicate review.
- Prioritize moderation by risk, completeness, duplicate likelihood, and submission age; keep reviewer decisions auditable.
- Add contributor activity and explicit, tested profile privacy controls.
- Give maintainers actionable metrics for submissions, review age, catalogue freshness, and import quality.
- Establish a repeatable, resumable bulk-ingestion pipeline with dry-run validation, batch checkpoints, idempotent upserts, duplicate/conflict reports, provenance retention, and operator-visible failure recovery.
- Separate discovery candidates from canonical catalogue records: bulk imports must land in a review/staging state and must never auto-verify, auto-feature, or auto-publish APIs.
- Add source adapters only for datasets whose licenses, attribution, freshness, and provider usage terms permit the intended collection and redistribution.

### Implementation status (updated 2026-11-09)

The following 0.4.0 components are implemented on `dev` and have focused regression coverage merged:
- Contributor profile privacy projection and regression tests.
- Structured catalogue duplicate/conflict reporting and tests.
- Moderation prioritization and operator-facing health/quality metrics.
- Resumable, bounded, idempotent importer with durable checkpoints and same-run PostgreSQL advisory locking.
- PostgreSQL-backed recovery and concurrent-run integration test, executed in Application CI with `go test -race`; the test passed on the merged importer fix.
- Contributor browser journey covering API submission, private submission tracking, public-profile opt-in/opt-out, and non-disclosure of account email and user ID.
- Moderation browser journey covering pending, in-review, changes-requested, return-to-review, approval, audit history, and the rule that approval leaves the API unpublished pending verification.
- Authenticated standard-user browser coverage proving denial across protected admin pages, plus a forged Server Action E2E test that replays a captured admin mutation request with non-admin cookies and verifies the database remains unchanged. The source-level regression guard continues to require `requireAdmin()` before form-data reads or database access in every admin action module.
- Browser coverage for contributor submission and private submission tracking, public-profile opt-in/opt-out privacy, authenticated non-admin denial, and the moderation lifecycle from pending through changes requested and approval. Approval leaves the resulting API unpublished and pending verification (PRs #122–#124).

The merged CI evidence for the importer fix includes successful Go importer/verifier checks, Application CI (including the PostgreSQL recovery/concurrency test, 91 unit tests, and 17 database integration tests), Docker build, and repository hygiene. PR #124 subsequently passed Application CI, Go importer, Go verifier, Docker build, and repository hygiene. This is implementation evidence, not a declaration that the entire 0.4.0 milestone is release-ready.

**Browser authorization and moderation acceptance evidence:** [PR #141](https://github.com/yyyuvvvraj/APIVault/pull/141) merged the direct non-admin Server Action replay test and the CI-only auth throttling adjustment. Its Browser E2E run [42681485824](https://github.com/yyyuvvvraj/APIVault/actions/runs/42681485824) completed with **5 passed (16.6s)** and no retries. The post-merge checks on merge commit `fd03caf2f92bc798773e24489c3892e3ac9b1b8a` passed Application CI, Go importer, Go verifier, Docker build/smoke test, and repository hygiene.

Before preparing a 0.4.0 release snapshot, complete and record a single acceptance review covering the end-to-end contributor submission and moderation journeys, privacy behavior in the integrated UI/API, operational metrics and their definitions, source/license/attribution eligibility for every ingestion adapter, failure/recovery operator procedures, and all required checks on the exact release candidate. Hosted validation, restore evidence, and production operational controls remain separate gates. Keep `stable` unchanged until every gate is satisfied.

### Catalogue scale programme (directional targets, not release guarantees)
- 1,000 high-quality candidates: prove curation, deduplication, evidence capture, and review throughput.
- 10,000 candidates: prove repeatable batch ingestion, resumability, and search/index performance.
- 50,000 candidates: validate database/query performance, moderation sampling, and operational cost.
- 200,000 candidates: long-term catalogue target, reached only from permitted, deduplicated sources with clear provenance and a sustainable refresh process.

A raw endpoint URL is not a catalogue record. Count distinct API products/services, not endpoint paths, SDK methods, versions, or mirrors. Preserve provider identity and source attribution. Do not scrape or redistribute data contrary to provider terms or dataset licenses. Never invent pricing, authentication, rate limits, or verification claims; unknown facts remain unknown.

### Acceptance gates
- End-to-end tests cover submission, reviewer decisions, approval, revision history, and return-to-verification.
- Authorization tests prove that non-maintainers cannot moderate or publish.
- Public profile privacy defaults and opt-in behavior are tested.
- Bulk ingestion is dry-run-first, resumable, idempotent, bounded, observable, and safe under partial failure; repeat imports do not create duplicate canonical records.
- Imported candidates remain unverified and unpublished until explicit maintainer review and evidence-based verification.
- Abuse controls are in place before any expansion of public registration.
- Documentation records source licensing, attribution, refresh policy, and the definition of a countable API.

## 0.5.0 — Reliable beta and 1,000-API catalogue

### Catalogue acceptance gate (mandatory)
- At least **1,000 distinct API products/services** are present in the canonical catalogue by the 0.5.0 release candidate.
- Count only records that pass the catalogue's publication and verification policy; pending, unverified, duplicate, archived, endpoint-only, version-only, and mirror records do not count.
- Every counted API has a provider, category, official HTTPS source evidence, and reviewed verification/publication state.
- Publish a reproducible count report with the query or script, generated timestamp, and breakdown by category/provider.
- If the count is below 1,000, 0.5.0 is not release-ready. Do not lower quality gates to hit the number.

### Deliverables
- A documented deployment path with environment validation and safe migration execution.
- External uptime/readiness monitoring and tested alert delivery.
- Automated database backup scheduling, retention policy, and a recorded isolated restore drill.
- Centralized logs/metrics with request correlation and operational ownership.
- Security review of authentication, cookies, CSP, trusted proxy configuration, verifier egress/SSRF boundaries, and dependency/container findings.
- Responsive, keyboard-accessible product smoke tests for catalogue, API docs, playground, account, and moderation journeys.
- A beta operations runbook covering incident response, rollback/forward-fix, and credential rotation.

### Acceptance gates
- A clean deployment can be reproduced from documented instructions.
- Backup restore is demonstrated against an isolated target and recovery steps are recorded.
- Alerts are received by a named operator during a controlled test.
- No unresolved critical security finding; high-severity findings have a documented disposition and owner.
- Essential unit, integration, browser E2E, repository, verifier, and container checks pass on the exact beta candidate.
- Known limitations and unsupported hosting guarantees are disclosed.

## 1.0.0 — General availability

GA requires all gates in [V1_RELEASE_CHECKLIST.md](V1_RELEASE_CHECKLIST.md) and [RELEASE_READINESS.md](RELEASE_READINESS.md), plus an approved production domain, operational ownership, legal/license metadata, a tested backup restore, and post-release smoke checks.

## Release discipline

- Keep `dev` as the integration branch and `stable` as the release branch.
- Every feature PR targets `dev`, includes tests and documentation, and passes required checks.
- Prepare a release PR from a reviewed `dev` commit into `stable`; do not force-push or bypass protections.
- Publish a 0.x GitHub Release as a prerelease only from a tag whose commit is already contained in `stable`.
- Align the package version, changelog heading, tag, and release notes.
- Use patch versions for fixes to a published milestone; use the next minor version for a meaningful capability milestone.
- Do not mark a milestone complete because its documentation or checklist exists. Record evidence for every acceptance gate.

## Explicitly not promised

No fixed delivery date, uptime SLA, paid tier, public self-service registration, write API, or provider endorsement is implied by this roadmap.
