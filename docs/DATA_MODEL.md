# APIVault canonical data model

## Design goals

1. Store each catalogue fact once and reuse it in the website and public REST API.
2. Preserve provenance: material claims must point to source URLs and check dates.
3. Model multi-valued relationships relationally rather than as opaque JSON arrays.
4. Keep moderation submissions separate from published records.
5. Keep an audit snapshot when a published record changes.
6. Never store third-party API credentials or secrets.

The Prisma schema in `prisma/schema.prisma` is the executable model. This document explains its intent.

## Core entities

| Entity | Responsibility |
|---|---|
| `ApiProvider` | Organization that publishes one or more APIs |
| `Api` | Canonical API catalogue entry and publication state |
| `Category` | Hierarchical browsing taxonomy |
| `Tag` | Flexible discovery labels |
| `ApiCategory` | Many-to-many API/category link |
| `ApiTag` | Many-to-many API/tag link |
| `ApiAuthMethod` | Authentication mechanisms supported by an API |
| `ApiSource` | Evidence URL for homepage, docs, pricing, auth, limits, terms, and status |
| `ApiRateLimit` | Structured rate-limit summary with optional evidence source |
| `ApiPricingPlan` | Named pricing tier with optional amount, currency, cadence, and evidence |
| `ApiSubmission` | Proposed create/update payload awaiting moderation |
| `SubmissionSource` | Evidence supplied with a proposed change |
| `ApiRevision` | Immutable JSON snapshot and actor/action metadata for a published change |

## Canonical API record

An `Api` is identified internally by UUID and externally by a unique stable slug. It references one provider and stores the high-level facts needed by search and detail pages:

- Name and short summary.
- Optional longer description.
- Homepage, documentation, and base URLs.
- Pricing classification and explanatory summary.
- Operational status.
- Verification status and verification/check timestamps.
- Publication and update timestamps.

Categories, tags, authentication, source evidence, pricing plans, and rate-limit facts are separate related records. This avoids duplicating category names or treating evidence as unstructured prose.

## Lifecycle enums

### API status

- `ACTIVE`: currently listed and usable according to the latest verified information.
- `DEPRECATED`: provider has announced deprecation or replacement.
- `UNAVAILABLE`: known to be unavailable.
- `ARCHIVED`: retained for history but no longer discoverable as active.

### Verification status

- `UNVERIFIED`: submitted or imported, not yet checked.
- `PENDING_REVIEW`: awaiting maintainer verification.
- `VERIFIED`: required claims have supporting sources and a recent maintainer check.
- `STALE`: the prior verification is out of date or needs re-checking.

Public listing queries must require both `status = ACTIVE` and `verificationStatus = VERIFIED`. An unverified entry must never appear as a verified recommendation.

### Submission status

`PENDING → IN_REVIEW → APPROVED | CHANGES_REQUESTED | REJECTED`

Approval is not merely a status update: a maintainer applies the reviewed payload to the canonical record and writes an `ApiRevision` snapshot in the same database transaction.

## Provenance rules

- Every public API must have an official homepage source.
- Documentation, pricing, authentication, and rate-limit claims should have separate source records where those claims are known.
- Every source has a kind, URL, official-source flag, notes, and checked timestamp.
- When a fact cannot be verified, keep it unknown; do not fill it with an assumption.
- Pricing amounts are decimal values with explicit currency and billing interval. Free/freemium is not equivalent to "unlimited".
- Rate-limit facts need scope and a time window when the provider documents them.

## Search indexes

The current Prisma model includes indexes for slugs, status/verification filters, provider, pricing model, update time, category and tag lookups. The first query implementation uses case-insensitive substring matching.

A future migration may add PostgreSQL GIN full-text and `pg_trgm` indexes. Add these only after measuring query latency and catalogue growth; keep the index definition in a committed SQL migration.

## Public API contract

The REST API serializes public fields deliberately. Never return:
- Internal submission payloads.
- Reviewer identities or moderation notes.
- Private submitter information.
- Internal audit snapshots.
- Unapproved or unverified source data.

The public serializer is the boundary between the relational model and the stable HTTP contract. Versioned routes can evolve without exposing the database schema directly.
