# APIVault release-readiness checklist

This checklist defines the evidence required before APIVault moves from development to a public release. It is a gate, not a declaration that the project is currently production-ready. Check items only after the evidence has been reviewed.

## 1. Code and CI

- [ ] All intended changes are merged into `dev`; no release work depends on an unmerged feature branch.
- [ ] Application CI passes on the exact release candidate commit: unit tests, PostgreSQL integration tests, lint, typecheck, and production build.
- [ ] Browser E2E passes on the exact release candidate commit.
- [ ] Repository hygiene and Docker build/smoke tests pass on the exact release candidate commit.
- [ ] Go verifier CI passes when verifier code or its workflow is part of the release.
- [ ] Dependency updates and security alerts have been triaged; no unresolved critical/high issue is accepted without a documented owner and mitigation.
- [ ] The dependency lockfile is committed and CI installs with `npm ci`.

## 2. Security and access control

- [ ] Verify GitHub branch protection/rulesets for `dev` and `stable`: require pull requests, required status checks, up-to-date branches where appropriate, and restrict direct pushes.
- [ ] Confirm CODEOWNERS review requirements match the actual maintainer workflow and that emergency bypass permissions are limited.
- [ ] Add and pass an authenticated non-admin session test proving admin pages and server actions reject non-admin users.
- [ ] Review Better Auth configuration, cookie/session settings, secret rotation, password policy, and administrator provisioning for the intended hosting environment.
- [ ] Decide and implement an application Content Security Policy; review HSTS and other transport headers at the hosting edge.
- [ ] Confirm public registration remains disabled unless an abuse-resistant registration and moderation design is explicitly approved.
- [ ] Verify metrics and internal verifier endpoints reject missing, invalid, and malformed credentials and are not exposed through public documentation.
- [ ] Confirm security reporting is enabled for the repository and the private reporting route is usable by maintainers.

## 3. Data and operational resilience

- [ ] Select the hosting and PostgreSQL providers; document region, network boundaries, TLS, connection pooling, and resource limits.
- [ ] Configure automated database backups and demonstrate a restore into an isolated environment.
- [ ] Document migration execution, pre-migration backup expectations, rollback/forward-fix procedure, and ownership.
- [ ] Set up centralized logs, metrics retention, alerting, and an incident contact; process-local metrics alone are not sufficient.
- [ ] Define readiness/liveness probes, uptime objectives, maintenance expectations, and incident response steps.
- [ ] Review rate-limit proxy trust configuration and test it behind the actual production ingress.
- [ ] Configure and test verifier worker secrets, outbound network restrictions, scan concurrency, and failure handling if the worker is enabled.

## 4. API and product contract

- [ ] Review `docs/openapi.json` against the deployed route behavior, including errors, pagination, ETags, 304 responses, cache directives, and rate-limit headers.
- [ ] Review `docs/API_USAGE_POLICY.md` for accurate limits, attribution, caching, and support expectations.
- [ ] Confirm the catalogue contains only records that satisfy the documented verification and publication policy.
- [ ] Confirm API submission, moderation, revision history, and unpublishing workflows have maintainer sign-off.
- [ ] Review privacy and data-retention practices for account, session, audit, request-log, and rate-limit data.

## 5. Release execution

- [ ] Update the changelog and user-facing documentation.
- [ ] Choose a version and create the release candidate from a reviewed `dev` commit.
- [ ] Merge the approved release candidate into `stable`; verify the release commit is contained in `stable`.
- [ ] Create the version tag only on a commit already contained in `stable`.
- [ ] Verify the published container image, multi-architecture manifests, provenance/SBOM artifacts, and image startup configuration.
- [ ] Run post-release smoke checks and record the result and rollback/forward-fix decision.

## Current known gaps to resolve before a stable public launch

- Authenticated non-admin session denial is now covered by `tests/e2e/admin-workflows.spec.ts`; rerun this test on the exact release candidate commit before launch.
- A reviewed Content Security Policy and hosting-edge transport-security configuration are still outstanding.
- Production hosting, secrets management, centralized observability/alerting, automated backups, and a tested restore procedure have not been selected and validated.
- Repository branch protection/ruleset settings are GitHub-side configuration and must be verified in repository settings; workflow files cannot prove those controls are enabled.
- The project remains in development. Passing CI and building a container do not by themselves authorize a production launch.
