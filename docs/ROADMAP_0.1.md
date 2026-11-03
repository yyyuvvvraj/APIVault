# APIVault v0.1 roadmap

v0.1 focuses on making APIVault useful to developers and contributors while improving catalogue quality and operational resilience. It is a development milestone, not a production-readiness declaration.

## Goals and acceptance criteria

### 1. Developer experience

**API keys**
- Keep the existing read-only public API usable without a key.
- Add optional, user-owned API keys with a visible prefix and one-time secret display.
- Store only a cryptographic hash of each key; never persist or log the raw secret.
- Support revoke, rotate, expiry, last-used timestamps, and narrowly defined read-only scopes.
- Attribute rate-limit consumption to a valid key while retaining anonymous client-IP protection.
- Do not increase quotas until abuse controls and per-key limits are tested.

**Documentation and playground**
- Keep `docs/openapi.json` aligned with the deployed route contract, including the current search/sort options and error/rate-limit headers.
- Serve a discoverable API reference from the application using the canonical OpenAPI document.
- Provide a browser playground for the three read-only endpoints, with query inputs, response status, headers, and formatted JSON.
- Make clear that requests are sent to the configured APIVault host and that the playground does not expose secrets.

**Dependency:** API-key self-service depends on an approved account onboarding model. Public signup is currently disabled; the first release should use admin-issued/invite-only keys unless that policy is deliberately changed.

### 2. Catalogue growth and metadata quality

- Expand the curated catalogue in reviewed batches; every published record must continue to satisfy ACTIVE + VERIFIED visibility rules.
- Add a metadata completeness checklist for documentation, base URL, pricing, authentication, rate limits, terms, status page, and official evidence where applicable.
- Improve importer validation and duplicate detection before increasing dataset size.
- Add tests that prove incomplete or unverified records never become publicly visible.
- Track catalogue quality using measurable completeness and freshness indicators rather than raw record count alone.

### 3. Community and contributor experience

- Design contributor identity around authenticated accounts, with an explicit public-profile opt-in.
- Associate submissions and moderation outcomes with a stable contributor identity while preserving existing audit history.
- Improve the submission form with clearer validation, source guidance, duplicate detection, and submission status visibility.
- Retain moderator approval and evidence-gated publication; contributor submissions must never publish directly.
- Add anti-abuse controls before enabling open registration or broad public submission.

**Dependency:** public contributor profiles and self-service API keys share the account-onboarding and privacy decisions. Do not enable public registration implicitly as part of either feature.

### 4. Reliability and security

- Configure automated database backups and document retention, recovery-point, and recovery-time expectations.
- Perform and record a restore drill into an isolated database before treating backups as validated.
- Add external uptime/readiness monitoring, centralized log retention, actionable alerts, and named incident ownership.
- Review CSP, HSTS, cookies, trusted proxy handling, and rate-limit behavior at the actual hosting ingress.
- Add operational runbooks for migration failure, database unavailability, credential rotation, and incident response.
- Keep provider-specific operations (Render/Neon settings, alert destinations, backup schedules) documented separately from code checks.

## Delivery sequence

1. **Foundation:** synchronize v0.0.1 release metadata into `dev`; establish v0.1 acceptance tests and keep `stable` unchanged.
2. **Developer experience:** OpenAPI contract accuracy and interactive reference/playground first; then API-key storage, lifecycle, authentication, and per-key throttling.
3. **Catalogue quality:** metadata completeness and importer improvements, followed by curated dataset expansion.
4. **Community:** account/onboarding decision, contributor identity, submission UX, and moderation improvements.
5. **Reliability:** security hardening in code alongside external monitoring, backups, restore evidence, and runbooks.

Work should be delivered as focused pull requests targeting `dev`. Each PR must include tests and relevant documentation. Do not tag v0.1 or promote changes to `stable` until the hosted validation and operational gates are explicitly reviewed.

## Out of scope for v0.1

- Paid plans, billing, or commercial quota promises.
- Write-capable public API keys or API mutations.
- Automatic publication of community submissions.
- A production uptime/SLA commitment before backups, restore, monitoring, and incident ownership are demonstrated.
