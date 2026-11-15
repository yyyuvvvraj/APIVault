# High-priority candidate staging

This workflow closes the gap between the report-only high-priority audit and the
canonical APIVault catalogue.

## Run

1. Open **Actions → Stage high-priority APIs for maintainer review**.
2. Use audit run ID `43271252196` (or another successful audit run containing
   `high-priority-candidates.json`).
3. Set **confirm_stage** to true and dispatch.

The workflow downloads the immutable audit artifact, validates its complete
manifest, runs the Python safety tests and Go importer tests, performs an
importer dry run, then imports in resumable batches of 100.

## Safety guarantees

- Every imported API must be `PENDING_REVIEW`; `VERIFIED` is rejected.
- Every source must remain `isOfficial=false`; the workflow cannot attest
  provider ownership.
- Featured records, duplicate slugs, duplicate provider homepage hosts,
  missing categories/auth classification, and non-HTTPS evidence are rejected.
- Existing importer protections for already-verified records remain in force.
- No verifier or publication endpoint is called.
- The admin verification queue is where a maintainer inspects each staged API,
  confirms official ownership and API-specific metadata, and records the review.

A successful staging run increases the canonical catalogue's review backlog,
not the verified or published count. Verification and publication remain
separate operations and continue to use the existing strict lifecycle policy.
