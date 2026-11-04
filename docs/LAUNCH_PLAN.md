# APIVault v1.0.0 launch plan

**Positioning:** The GitHub of APIs — discovery, verification and community.

**Core promise:** Find APIs, understand their capabilities and requirements, inspect verification evidence, and help the ecosystem improve through community curation.

## Launch objectives

1. Make the product immediately understandable to developers arriving from GitHub, search or a launch post.
2. Demonstrate a complete journey: discover a listing, inspect metadata and evidence, use the read-only catalogue API, and submit a correction or API suggestion.
3. Establish trust through transparent verification semantics, source attribution, moderation, security controls and operational readiness.
4. Convert launch attention into durable contributors, useful catalogue improvements and returning users.

Stars are a visibility signal, not the product outcome. Do not buy stars, run reciprocal star exchanges, or ask for low-effort engagement. Ask people to star only when they find the project useful.

## Product narrative

APIVault is not an API gateway, API hosting provider or guarantee that third-party services will remain online. It is a community-driven discovery and verification layer for API information.

### Three pillars

- **Discovery:** searchable, structured catalogue records with provider, category, documentation, authentication and pricing metadata where known.
- **Verification:** evidence-based review and verifier observations, with timestamps and clear limitations. A successful check is a point-in-time signal, not an uptime or security guarantee.
- **Community:** API suggestions, corrections, moderation and opt-in contributor recognition.

### Message hierarchy

- One-line: The GitHub of APIs — discovery, verification and community.
- Short: Discover APIs, inspect verification evidence, and help curate a more useful API ecosystem.
- Technical: An open-source API catalogue with a read-only REST API, OpenAPI documentation, evidence-based verification workflows and moderated community submissions.

## Audience and channels

| Audience | Need | Channels |
| --- | --- | --- |
| Developers integrating third-party APIs | Useful metadata, docs, requirements and examples | GitHub, Hacker News, relevant Reddit communities |
| Indie hackers and builders | Faster API discovery and a usable catalogue | Product Hunt, X, LinkedIn, builder communities |
| API providers and maintainers | Accurate representation and a correction path | Direct outreach, GitHub issues and discussions |
| Open-source contributors | Clear setup, scoped issues and review expectations | GitHub Discussions, good-first-issue backlog, Dev.to |

Follow each community's self-promotion rules, disclose project affiliation, and lead with a useful demo or technical lesson. Do not paste identical promotional copy everywhere.

## Launch sequence

### Phase 1 — Foundation
- Finalize repository positioning, README, topics, description and homepage.
- Publish architecture, setup, API usage, verification and contribution guidance.
- Prepare a short demo showing discovery, detail metadata, docs/playground and submission workflow.
- Create a visible v1.0.0 milestone and triaged launch issues.
- Confirm the public demo URL and production environment before publishing them.

### Phase 2 — Product proof
- Test the primary user journey on desktop and mobile.
- Validate catalogue quality, source links, metadata freshness and verification semantics.
- Validate API contracts, rate limits, error handling and API key lifecycle.
- Run full CI, browser, integration and container suites.
- Complete backup restoration and incident-response exercises, not just backup creation.
- Confirm monitoring, alert delivery, database readiness and rollback procedures.

### Phase 3 — Launch assets
- 60–90 second demo: search → API detail → verification evidence → docs/playground → community submission.
- Two or three annotated screenshots with real, non-sensitive data.
- Architecture diagram and concise technical write-up.
- Release notes with shipped capabilities, known limitations and setup instructions.
- Product Hunt listing and Hacker News Show HN draft, published only when the live product is ready.
- Dev.to/Hashnode article explaining evidence-based verification and catalogue curation.
- Short social posts linking to the demo and repository.

### Phase 4 — Launch day
1. Publish v1.0.0 from the approved stable commit.
2. Publish the announcement and demo.
3. Submit to Product Hunt and/or Hacker News according to their current rules and timing.
4. Share in relevant communities with affiliation disclosure and useful technical context.
5. Be present to answer questions, acknowledge issues and thank contributors.
6. Track qualified visits, successful catalogue journeys, API usage, useful submissions, contributor PRs and repeat usage.

### Phase 5 — First 7 days after launch
- Triage issues daily and publish concise status updates.
- Fix launch-blocking bugs before adding features.
- Review search terms and catalogue gaps from real feedback.
- Thank and onboard first contributors.
- Publish a post-launch report with metrics, limitations and next priorities.

## Release gates

Do not call v1.0.0 ready until all are true:

- [ ] Public demo URL is stable, reachable and reflects the intended release commit.
- [ ] Search, filters, API detail pages and category browsing work on desktop and mobile.
- [ ] Public REST API and OpenAPI document agree; pagination, errors, rate limits and caching are tested.
- [ ] API key creation, hashing, expiry, revocation and throttling are verified; secrets never appear in logs.
- [ ] Submission and moderation enforce authorization and prevent concurrent decision overwrites.
- [ ] Verification policy distinguishes evidence, point-in-time checks and provider uptime guarantees.
- [ ] Curated records have official sources and no unsupported pricing, auth or availability claims.
- [ ] Unit, integration, browser E2E, repository and Docker checks pass on the release candidate.
- [ ] Production security review covers authentication, authorization, SSRF, rate limiting, headers, dependencies and secret handling.
- [ ] Backup restoration has been tested against a disposable environment and documented.
- [ ] Monitoring and alert delivery are verified; rollback and incident contacts are documented.
- [ ] README, setup, contribution, security, changelog and release notes match shipped behaviour.
- [ ] License, version metadata, release tag and stable branch ancestry are consistent.
- [ ] Known limitations and operational ownership are disclosed.

## Metrics

Measure outcomes rather than vanity alone:

- Activation: visitors who complete a search and open an API detail page.
- Catalogue utility: search-to-detail click-through and zero-result searches.
- Trust: listings with authoritative source links and current verification observations.
- Developer experience: OpenAPI usage, API request success rate and repeat API consumers.
- Community: valid submissions, accepted corrections, first-time contributors and PRs merged.
- Reliability: availability, API error rate, alert response time and successful restore exercises.
- Reach: repository visits, unique referrers, stars and forks. Stars are a lagging signal, not a target to manipulate.

## Release history note

The repository already has a published v0.0.1 GitHub Release. Preserve its tag and historical record. Before the v1.0.0 campaign, maintainers should decide whether to mark that release as prerelease/early-access and update its wording. Do not claim v1.0.0 is literally the first public GitHub release while v0.0.1 remains published as a normal release.

## Execution rules

- Feature and launch-preparation PRs target dev; release promotion is a separate controlled operation.
- Keep stable protected and never force-push it to solve ancestry problems.
- Do not publish a demo URL, uptime claim, customer count or API count unless verified.
- No fabricated testimonials, fake traffic, purchased stars or undisclosed promotion.
- Prefer a few meaningful launch-blocking PRs over a large cosmetic stack.
