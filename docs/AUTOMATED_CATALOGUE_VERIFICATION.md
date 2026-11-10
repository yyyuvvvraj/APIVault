# Automated catalogue verification

APIVault runs a scheduled verification pass against up to 1,000 active, unpublished
records in `UNVERIFIED`, `PENDING_REVIEW`, or `STALE` state. Newly approved
community submissions become API records in this queue and are picked up by the
next scheduled run.

## What can be auto-verified

The pipeline only publishes a record when all of these machine-checkable gates pass:

- The API has an exact official homepage source matching `homepageUrl`.
- It has an exact official documentation source matching `documentationUrl`.
- Homepage and documentation use the same hostname or a conservative parent/subdomain
  relationship. Third-party documentation hosts are sent to manual review.
- Homepage, documentation, and every linked source pass public HTTPS reachability
  checks. Redirects must remain HTTPS; homepage and documentation redirects must
  remain on the provider domain.
- At least one category and an explicit authentication classification are present.
- Known pricing claims have an official pricing source. Known authentication claims
  have an official authentication source. Unknown values remain unknown.
- The batch has no detected provider/name duplicate or cross-provider homepage
  collision, and a second duplicate check runs against the live database.
- The API is active, unpublished, unfeatured, and still in a pending verification
  state when the decision is applied.

Eligible records are marked `VERIFIED` and published with an immutable revision
note identifying the automated policy version. Records that fail any gate remain
unpublished and appear in the workflow's held/review report. No source text is
scraped to invent pricing, rate limits, authentication, or other metadata.

## Important limits

Reachability and domain relationships are evidence signals, not cryptographic proof
of provider ownership. The automated workflow does not certify copyright, licensing,
provider terms, data reuse rights, or the legal accuracy of a listing. Third-party
documentation hosts, ambiguous ownership, missing evidence, duplicates, and failed
checks are never auto-approved. Unknown pricing/authentication details are not guessed.

This automation is intended for catalogue publication metadata and official links;
it does not call authenticated API endpoints, bypass rate limits, or collect provider
data. The policy should be tightened, not relaxed, if false positives are observed.

## One-time setup

1. Set the repository variable `APIVAULT_INTERNAL_URL` to the HTTPS origin of the
   deployed APIVault application (for example, your production domain, with no path).
2. Generate a long random secret and add it as the GitHub Actions repository secret
   `APIVAULT_AUTO_VERIFY_SECRET`.
3. Add the exact same value as the deployed application's environment variable
   `APIVAULT_AUTO_VERIFY_SECRET`, then redeploy the application.
4. Run **Actions → Automated catalogue verification → Run workflow** once and inspect
   the 90-day evidence artifact. The workflow then runs daily at 04:17 UTC.

The secret authorizes only the dedicated export/apply endpoint. Do not reuse database
credentials or expose the secret in logs, workflow inputs, or committed files.
