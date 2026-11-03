# APIVault product direction

## Product decision

APIVault will be built as a **web application first**, backed by a well-designed, curated API catalogue. A public REST API will be introduced as the catalogue, validation rules, and operational needs mature.

The catalogue is the source of truth. The web application and future REST API must consume the same canonical records rather than maintaining separate copies of API metadata.

## Who it serves

- Developers looking for APIs for side projects, prototypes, and production systems.
- Students and builders exploring available services.
- API providers who want accurate, discoverable representation of their developer offering.
- Open-source contributors who can improve catalogue coverage and quality.

## Initial web application scope

### Discovery
- Search by API name, provider, description, and tags.
- Filter by category, authentication method, pricing model, and availability.
- Sort by relevance and selected catalogue attributes.
- Shareable URLs for search and category filters.

### API profile
Each API profile should show, where known:
- Name, provider, concise description, and category.
- Official homepage and documentation.
- Base URL and supported protocol or interface.
- Authentication methods.
- Pricing model and source for pricing claims.
- Rate limits and important usage restrictions.
- Geographic or account requirements.
- Tags and related APIs.
- Last verified date and links to evidence.

Unknown information must remain explicitly unknown. The catalogue must not label an API "free", "unlimited", or "production-ready" without evidence.

### Community submissions
- Contributors can propose new entries or corrections.
- Submissions include source URLs and the date checked.
- New or materially changed records enter a review queue.
- Maintainers can approve, request changes, reject, or flag stale records.
- Keep an audit trail for catalogue edits.

## Canonical catalogue record

The initial logical model should include these fields. This is a product-level contract, not yet a committed database schema.

| Field | Purpose |
|---|---|
| id | Stable internal identifier |
| slug | Human-readable, URL-safe unique identifier |
| name | Official API name |
| provider | Organization or developer providing the API |
| summary | Short factual description |
| description | Longer explanation of capabilities |
| categories | One or more maintained category identifiers |
| tags | Search and discovery terms |
| homepage_url | Official product or API homepage |
| documentation_url | Official developer documentation |
| base_url | API base URL, when applicable |
| auth_methods | Known authentication mechanisms |
| pricing_model | free, freemium, paid, open-source, or unknown |
| pricing_notes | Factual details and qualifications |
| rate_limits | Known limits, with source and scope |
| restrictions | Geography, account, commercial-use, or other constraints |
| sources | Evidence URLs supporting catalogue claims |
| verification_status | unverified, needs_review, verified, or stale |
| verified_at | Date the record was last checked |
| created_at / updated_at | Record lifecycle timestamps |
| status | active, deprecated, unavailable, or archived |

Avoid storing secrets, access tokens, private API keys, or user credentials in catalogue records.

## Future public REST API

The REST API is a planned phase, not a claim that endpoints already exist.

A possible versioned resource design:

- `GET /api/v1/apis` — browse and filter catalogue records.
- `GET /api/v1/apis/{slug}` — retrieve one API profile.
- `GET /api/v1/categories` — list categories.
- `GET /api/v1/tags` — list supported tags.

Before public release, define an OpenAPI specification, pagination, stable error formats, cache behaviour, rate limits, attribution, and a versioning/deprecation policy. Public endpoints should expose only approved catalogue fields.

## Delivery phases

### Phase 0 — Foundation
- Repository governance, contribution process, license, and CI.
- Agree on catalogue schema and verification standards.
- Choose the application stack and deployment approach.

### Phase 1 — Useful web MVP
- Build the catalogue storage and data validation.
- Implement browsing, search, filters, and API profile pages.
- Seed a small, carefully verified catalogue.
- Add responsive design, accessibility, and basic analytics.

### Phase 2 — Community contributions
- Submission and correction workflow.
- Moderation queue and audit history.
- Contributor guide, good-first-issue backlog, and release cadence.

### Phase 3 — Public REST API
- Publish versioned read-only endpoints.
- Publish OpenAPI documentation and usage policy.
- Add caching, observability, abuse protection, and rate limits.

### Phase 4 — Ecosystem
- Provider pages, integrations, client examples, and community tooling based on validated demand.

## Non-goals for the first release

- Running or proxying third-party API requests.
- Storing provider API keys or handling users' credentials.
- Claiming uptime or latency guarantees for third-party providers.
- Publishing unverified pricing or rate-limit claims.
- Releasing a public API before data quality and operational controls are ready.

## Open decisions

The following application decisions are now recorded in [ARCHITECTURE.md](ARCHITECTURE.md):
- Remaining work: hosted database and deployment provider, search indexing strategy after measurement.
- Hosting and deployment platform.
- Catalogue submission and moderation UX.
- Initial category taxonomy and seed dataset.
- Whether catalogue data and application code need separate licensing terms.
