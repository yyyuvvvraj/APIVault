# Full discovery catalogue

The full-catalogue evidence workflow prepares a pinned, 2,284-record discovery
queue and read-only research artifacts. The separate `DiscoveryLead` table
keeps these candidates out of the verified `Api` catalogue and its public API.

## Import

1. Ensure the GitHub Actions repository secret `DATABASE_URL` points to the
   same PostgreSQL database used by the deployed APIVault application.
2. Run **Full catalogue evidence processing** on `dev`.
3. The successful run uploads:
   - `apivault-discovery-queue-<run-id>`, containing the immutable
     `queue.json` and source discovery/triage snapshots.
   - `apivault-research-batch-<run-id>-<batch>` artifacts covering every
     queued lead.
4. **Import discovery catalogue** downloads the exact queue and all research
   batches from that run. It checks that every queue ID has exactly one
   research result, evaluates the conservative review-readiness checks, and
   creates a complete disposition report.
5. The importer validates all expected unique IDs and idempotently upserts
   them into `DiscoveryLead`. If needed, manually dispatch the workflow with
   the successful full-catalogue run ID and expected lead count.

The importer refuses incomplete, duplicate, or mismatched reports and rejects
any record that is import-eligible, verified, or published. It never writes to
`Api`, `ApiProvider`, or `ApiSource`.

## Review status

- `READY_FOR_MAINTAINER_REVIEW` means the provider page passed basic
  research-hygiene checks: successful 2xx fetch, same-host HTTPS resolution,
  page title and description, and a same-host HTTPS API documentation link.
- `REVIEW_REQUIRED` means one or more of those observable checks is missing.

Neither disposition proves provider ownership, API functionality, licensing,
pricing, authentication behavior, rate limits, or permission to redistribute.
Every imported record remains `UNVERIFIED`, `NOT_PUBLISHED`, and
`humanReviewRequired=true`. A maintainer must inspect provider-controlled
evidence before preparing a separate curated API manifest.

## Website

The `/discover` page exposes the discovery queue with search, priority,
category, and review-status filters. The `/api/v1/discovery` endpoint exposes
the same review-only records. The existing `/apis` page and
`/api/v1/apis` endpoint continue to expose only active, verified, published
listings.
