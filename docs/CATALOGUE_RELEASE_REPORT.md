# Catalogue release-count report

The 0.5.0 milestone requires at least 1,000 distinct API products/services that satisfy the publication and verification policy. Generate a reproducible database snapshot from the intended PostgreSQL environment:

```bash
DATABASE_URL="$DATABASE_URL" npm run catalogue:report > catalogue-release-report.json
```

The command is read-only. It does not import, verify, publish, or modify catalogue records.

The report includes:
- generation timestamp and total/eligible/excluded record counts;
- the mechanical eligibility criteria applied;
- category and provider breakdowns;
- exclusion counts by reason; and
- the slugs and names of records included in the mechanical count.

A record is mechanically eligible only when it is ACTIVE, VERIFIED, published, associated with a provider and at least one category, and has an official HTTPS source. Duplicate provider/API-name identities are conservatively counted once.

## Required maintainer review

The script cannot prove that two differently named records are not mirrors or aliases, that a source license permits a particular use, or that a record represents a distinct API product rather than an endpoint, SDK, or version. Review the report's eligible list and source provenance before treating the number as the 0.5.0 acceptance count. Keep the generated report with the release-candidate evidence; do not commit database credentials or environment files.
