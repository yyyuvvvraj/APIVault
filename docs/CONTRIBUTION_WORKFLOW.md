# Catalogue contribution and review workflow

## Current intake path

Until the in-app authenticated submission interface is implemented, contributors submit proposed APIs or corrections through the GitHub issue template:

[Suggest an API](https://github.com/yyyuvvvraj/APIVault/issues/new?template=api_submission.yml)

A submission should include the official homepage, official documentation, pricing model, authentication method, and evidence for relevant claims. Do not include secrets or credentials.

## Maintainer workflow

1. Triage the report for duplicates, completeness, and scope.
2. Confirm the provider and official source URLs.
3. Verify each material claim using the evidence.
4. Mark missing or unsupported facts as unknown.
5. Prepare the canonical data change on a feature branch.
6. Open a pull request into `dev`, linking the original submission.
7. After approval and CI, merge the change and include a revision snapshot.
8. Recheck or mark the record stale when important provider facts change.

## Database lifecycle

The schema supports:
- `ApiSubmission`: proposed payload, target API, submitter handle, status, reviewer handle, review note, and timestamps.
- `SubmissionSource`: source evidence attached to a submission.
- `ApiRevision`: snapshot of the published API record and the action that produced it.

The first public contribution channel is GitHub Issues. The schema is ready for a later review queue, but there is deliberately no unauthenticated public POST endpoint that writes to the catalogue.

## Future in-app workflow prerequisites

Before enabling public app submissions, implement:
- Authenticated identity and a trusted maintainer role.
- CSRF protection and strict input validation.
- Rate limiting and anti-spam measures.
- Review permissions and approval rules.
- Transactional promotion of an approved submission into the canonical catalogue.
- Immutable audit/revision history and notification handling.
