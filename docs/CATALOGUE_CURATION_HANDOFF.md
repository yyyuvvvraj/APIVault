# Evidence-to-curation handoff

The curation handoff is the next human-controlled step after a provider evidence pack passes structural validation. It produces a review worksheet, not an importer manifest.

## Generate a handoff

From the repository root:

```bash
cd services/catalogue-importer
go test ./...
go run ./cmd/catalogue-curation-handoff \
  -input data/evidence-review/<batch-name>.json \
  -output curation-handoff.json
```

The report preserves the discovery `reviewId`, provider identity, homepage, documentation, terms URL, evidence claims, source URLs, source type, and access timestamps. Evidence claims are mapped to the importer's source-kind vocabulary for later maintainer use.

## Why this is not an importer manifest

Provider-level evidence does not identify a specific API product or service. It cannot safely supply:
- API name, summary, or description
- API base URL or endpoint family
- Catalogue categories
- API-specific authentication details
- API-specific pricing, quotas, and rate limits

Those fields remain explicitly listed under `missingApiMetadata`. The provider slug is a normalized suggestion only and must be reviewed for collisions before use.

The handoff always sets `importEligible: false`. Evidence failures remain `BLOCKED_EVIDENCE`; structurally complete submissions become `NEEDS_API_METADATA`. Neither state means the API has been verified, imported, or published.

## CI behavior

The provider evidence workflow runs the complete Go test suite, verifies gofmt, validates committed evidence packs, builds the corresponding curation handoff reports, and uploads both reports as a single workflow artifact. It asserts that every generated draft remains non-importable and retains missing API metadata requirements.

## Maintainer next step

For each handoff, identify the exact API product/service and research its canonical base URL, API-specific docs, categories, auth behavior, pricing, quotas, and status. Then prepare a separate curated importer manifest using the existing catalogue schema and validator. Keep unknown facts as `UNKNOWN`, include official sources for claims, and leave records pending/unverified. The normal dry-run validation and separate maintainer approval still apply before any database write.
