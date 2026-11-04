# APIVault v1.0.0 release checklist

Mark an item complete only when evidence exists.

## Product
- [ ] Catalogue search, filtering, sorting and categories work.
- [ ] API detail pages show accurate provider and source metadata.
- [ ] Public API exposes only published records and follows the documented contract.
- [ ] OpenAPI document matches live endpoints.
- [ ] /docs playground works against the intended public environment.
- [ ] Account, API key and submission workflows have been tested end-to-end.
- [ ] Admin verification and moderation enforce permissions.

## Data and verification
- [ ] Every launch catalogue record has an authoritative source.
- [ ] Pricing, authentication, limits and restrictions are verified or explicitly unknown.
- [ ] Verification timestamps and evidence are visible and understandable.
- [ ] Stale and failed observations are represented accurately.
- [ ] No language implies a point-in-time check guarantees uptime or security.

## Security
- [ ] Authentication and authorization reviewed.
- [ ] API key hashes, expiry, revocation and throttling tested.
- [ ] SSRF protections and URL validation reviewed for verifier paths.
- [ ] Rate limiting and trusted-proxy configuration verified in production.
- [ ] Secrets are not committed, logged or exposed in client responses.
- [ ] Dependency and container vulnerability review completed.
- [ ] Security reporting process and incident owner documented.

## Reliability and operations
- [ ] Application, database and verifier health checks tested.
- [ ] Monitoring checks production, not only CI.
- [ ] Alert delivery tested end-to-end.
- [ ] Database backup completed.
- [ ] Restore from backup tested in an isolated environment.
- [ ] Rollback procedure documented and rehearsed.
- [ ] Production environment variables and migrations reviewed.
- [ ] Operational owner and escalation path documented.

## Quality
- [ ] Repository checks pass.
- [ ] Application lint and typecheck pass.
- [ ] Unit and integration tests pass.
- [ ] Browser E2E tests pass.
- [ ] Docker build and runtime smoke tests pass.
- [ ] Desktop and mobile smoke tests completed.
- [ ] Accessibility and keyboard navigation smoke tests completed.
- [ ] No unresolved release-blocking issues.

## Release and communication
- [ ] README and docs match shipped behaviour.
- [ ] Changelog includes all v1.0.0 changes and known limitations.
- [ ] Package/application version metadata is consistent.
- [ ] Release candidate commit is on approved stable ancestry.
- [ ] v0.0.1 historical release treatment is decided and communicated accurately.
- [ ] v1.0.0 release notes and setup notes are ready.
- [ ] Demo URL and screenshots are verified.
- [ ] Launch copy reviewed for accuracy and community rules.
- [ ] Final go/no-go approval recorded.

## Post-launch
- [ ] Production checks monitored during launch.
- [ ] Issues and community questions triaged daily for the first week.
- [ ] Launch metrics reviewed and recorded.
- [ ] Contributors thanked and first follow-up issues prepared.
- [ ] Post-launch report published.
