# APIVault 0.0.1 release-readiness checklist

This checklist separates a **release candidate** from a production launch. A passing build is necessary, but it is not evidence of operational resilience. Do not check an item until the evidence exists for the exact candidate commit.

## 1. Candidate code and CI

- [ ] The consolidated `release/0.0.1` pull request is reviewed and merged into `stable`.
- [ ] Application CI passes on the exact stable release commit: unit tests, PostgreSQL integration tests, lint, typecheck, and production build.
- [ ] Browser E2E passes on the exact stable release commit, including authenticated non-admin denial.
- [ ] Repository hygiene and Docker build/container smoke tests pass on the exact stable release commit.
- [ ] Go verifier CI passes if the optional verifier is included in the deployment.
- [ ] `npm ci` succeeds from the committed lockfile; dependency/security alerts have been triaged.

## 2. Security and access control

- [ ] Verify GitHub rulesets/branch protection for `dev` and `stable`: pull requests, required checks, current branches, and direct-push restrictions.
- [ ] Confirm CODEOWNERS requirements and maintainer bypass permissions match the intended workflow.
- [x] Browser E2E includes a standard authenticated non-admin account and verifies denial on protected admin pages; the exact candidate run must still pass.
- [ ] Review Better Auth cookies, sessions, password policy, secret rotation, canonical URL, and first-admin provisioning on the release host.
- [ ] Review and implement the application Content Security Policy; verify HSTS and other transport headers at the hosting edge.
- [ ] Confirm public registration remains disabled.
- [ ] Verify metrics and internal verifier endpoints reject missing, invalid, and malformed credentials.
- [ ] Confirm the private security-reporting route is enabled and usable by maintainers.

## 3. Data and operations

- [ ] Confirm the production hosting/database topology, region, TLS, pooling, resource limits, and secret manager.
- [ ] Configure automated database backups and demonstrate a restore into an isolated database.
- [ ] Document migration ownership, pre-migration backup, and rollback/forward-fix procedure.
- [ ] Configure centralized logs, retention, alerting, and an incident contact; process-local metrics alone are insufficient.
- [ ] Define readiness/liveness monitoring, maintenance expectations, and incident response.
- [ ] Test trusted-proxy client-IP handling and rate limiting behind the actual public ingress.
- [ ] If the verifier worker is enabled, configure and test its secret, outbound network restrictions, concurrency, and failure handling.

## 4. Product and API contract

- [ ] Review `docs/openapi.json` against deployed route behaviour: errors, pagination, ETags, 304 responses, cache directives, and rate-limit headers.
- [ ] Confirm `docs/API_USAGE_POLICY.md` accurately describes limits, attribution, caching, and support expectations.
- [ ] Confirm only ACTIVE + VERIFIED catalogue records are publicly visible and reviewed records meet the evidence policy.
- [ ] Obtain maintainer sign-off for API submission, moderation, revision history, and unpublishing workflows.
- [ ] Review privacy and retention for account, session, audit, request-log, and rate-limit data.

## 5. Version and publication

- [ ] Confirm `package.json`, `CHANGELOG.md`, and the intended tag all identify `0.0.1`.
- [ ] Merge the reviewed candidate into `stable`; confirm the release commit is reachable from `stable`.
- [ ] Create `v0.0.1` only on that stable commit. The tag workflow validates stable ancestry, package version, and changelog entry before creating the GitHub Release.
- [ ] Wait for the Docker tag workflow to publish the amd64/arm64 GHCR image and provenance/SBOM attestations.
- [ ] Verify the image manifest, package visibility, runtime configuration, and container startup.
- [ ] Run post-release website, readiness, and public API smoke checks; record the result and rollback/forward-fix decision.

## Known items requiring external maintainer action

- GitHub branch protection/ruleset settings are repository-side controls and cannot be proven by workflow files.
- The current Render + Neon beta deployment proves the app can connect to its database; it does not prove backup/restore, alerting, production secrets management, or an operational SLA.
- A reviewed CSP and hosting-edge HSTS/transport-security configuration remain outstanding.
- Automated backups and a successful isolated restore have not been demonstrated.
- Centralized observability, alerting, incident ownership, and rate-limit proxy trust must be validated at the intended public ingress.

**Release classification:** Until the external operational items above are evidenced, describe v0.0.1 as an initial public/beta release with no uptime or support commitment—not as a production-hardened service.
