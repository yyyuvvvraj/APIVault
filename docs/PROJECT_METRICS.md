# Project metrics

This document defines project health metrics to review. Targets are goals, not current performance claims.

## Community
- Stars gained per 30 days.
- Forks and unique contributors.
- First-time contributors and repeat contributors.
- Issue response time.
- Discussion activity.

## Delivery
- Pull requests opened, merged, and closed.
- Median time to first review.
- Median time to merge.
- Release frequency.
- Open issue age and resolution rate.

## Quality
- CI pass rate.
- Test coverage once an application/test suite exists.
- Regressions reported per release.
- Data freshness and source verification coverage once the API catalogue exists.

## Reporting
Review trends monthly rather than optimizing for a single number. Stars and traffic are awareness signals; correctness, contributor retention, and useful releases are stronger indicators of project health.

GitHub repository traffic details are retained for a limited period. Export traffic data periodically if long-term trend reporting is required.

## In-product operations dashboard

The administrator dashboard reports operational queue and ingestion signals. Interpret them consistently:

- **Open moderation queue:** submissions in `PENDING` or `IN_REVIEW`; `CHANGES_REQUESTED` is excluded because the next action belongs to the contributor, not the reviewer.
- **Queue age bands:** age is measured from submission creation time. Under 24 hours is less than 24 hours; 1–3 days includes exactly 24 hours and excludes exactly 72 hours; 3+ days includes exactly 72 hours and older.
- **Oldest open item:** the creation age of the oldest `PENDING` or `IN_REVIEW` submission.
- **Import pipeline:** failed and running run counts, latest run status, processed/total records, and the latest run's error summary. These are operational progress indicators, not a measure of source-license approval or candidate publication quality.
- **Catalogue freshness:** the separate freshness report counts verified, non-archived APIs and flags records that have never been reviewed or are beyond the configured review interval. A review timestamp is a human attestation, not an automated reachability check.

These are point-in-time database views, not an SLA or a substitute for centralized monitoring and alerting.
