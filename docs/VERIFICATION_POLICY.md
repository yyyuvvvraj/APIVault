# API catalogue verification policy

APIVault is useful only when its information is trustworthy. Contributors should include sources; maintainers decide whether the evidence supports publication.

## Minimum evidence

A new API submission should include:
- Official homepage or provider product page.
- Official developer documentation, when available.
- Source links for pricing and authentication claims.
- Source links for rate limits, quotas, or usage restrictions when stated.
- A concise factual summary that does not overstate capabilities.

Third-party directory pages can help discovery but are not sufficient evidence for provider-specific claims.

## Review checklist

Before setting an entry to `VERIFIED`, a maintainer must confirm the publication prerequisites: an HTTPS developer documentation URL, an official homepage source whose URL exactly matches the API homepage, at least one category, and at least one explicit authentication classification. The public catalogue independently enforces these fields, an official HTTPS source, a publication timestamp, `ACTIVE` status, and `VERIFIED` status for both listings and detail lookups.

A maintainer should then confirm:
1. The API and provider are identifiable and the links resolve to the expected service.
2. The summary accurately reflects the official description.
3. Authentication information is supported by documentation.
4. Pricing labels and amounts match the source, including free-tier limits and billing period.
5. Rate limits include the correct scope/window where documented.
6. Restrictions, geography, account requirements, and terms are not omitted when material.
7. Evidence URLs and check dates are recorded.
8. No credentials, secrets, personal data, or unsupported claims are present.

The admin verification action requires a non-empty review note. The note should identify the material claims checked or explain why an entry was verified with unknown fields. The note is retained in the immutable revision summary.

When an admin marks an API as `VERIFIED`, APIVault records the current timestamp in `lastCheckedAt` and `checkedAt` for every linked source. The review page displays these timestamps, and the revision snapshot captures them. This timestamp records the maintainer's review action; it does not independently prove that a URL was reachable or that every claim is correct.

## Automated evidence-coverage hints

The maintainer verification queue checks that homepage, documentation, pricing, and authentication evidence is linked to official provider sources where those fields are known. It also flags official source records without a review timestamp and records whose official source review timestamps are older than 180 days. These are completeness and freshness hints, not an automatic verdict: a maintainer must open the sources, verify the claims, and record a review note. A timestamp means a maintainer recorded a review action; it does not guarantee that the source remains accurate between reviews.

## Unknown is an acceptable value

Use `UNKNOWN` when the source does not state the information or the maintainer cannot verify it. Never infer "free", "no authentication", "unlimited", or a specific rate limit merely because a demo request worked.

## Staleness and re-checks

Mark a record `STALE` when a material source is unavailable, facts conflict, the provider changes its terms, or the recorded check is no longer suitable for the claim. Pricing and rate limits should be rechecked more frequently than stable descriptive metadata.

The project should later automate stale-entry reminders using `lastCheckedAt`; automation must flag records for review rather than silently change provider facts.

## Corrections and removals

Corrections should be submitted through GitHub issues or pull requests and include the source of the correction. Deprecated, unavailable, and archived APIs should retain their historical record while being excluded from active public search results.
