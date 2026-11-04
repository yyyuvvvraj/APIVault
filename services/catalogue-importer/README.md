# APIVault Go Catalogue Importer

A dry-run-first Go CLI for importing API catalogue records into the existing APIVault PostgreSQL schema.

## Responsibilities

- Uses PostgreSQL through `pgx/v5`.
- Imports providers, APIs, category links, authentication methods, source references, and revision history.
- Uses bounded PostgreSQL transactions (default 100 records, maximum 250) with durable run and batch checkpoints.
- Commits each batch and its checkpoint atomically; completed batches are skipped when a failed run is resumed with the same run ID and unchanged input.
- Upserts providers and APIs by their stable slugs, making repeated imports safe.
- Replaces category and authentication-method associations for each imported API.
- Upserts source references by API and URL.
- Records each import as an `ApiRevision`.
- Refuses to set `verificationStatus: VERIFIED`. Imports default to `UNVERIFIED`; reviewers must verify records through the application workflow.

Prisma remains the owner of database schema and migrations. This service only writes data to tables created by Prisma migrations.

## Requirements

- Go 1.25+
- PostgreSQL schema migrated with the repository's Prisma migrations
- Existing category records seeded before applying an import

## Input format

- [Placeholder format example](examples/catalogue.example.json) shows the JSON shape only. It contains reserved `example.com` URLs and must never be applied to a real database.
- [Curated starter dataset](data/curated-starter-v1.json) contains five real API records with official source references. They are imported as `PENDING_REVIEW`, not verified.
- See the [catalogue curation guide](../../docs/CATALOGUE_CURATION.md) for evidence and review requirements.

Each API requires:
- a unique lowercase hyphenated `slug`
- a name and short summary
- a provider
- an HTTPS homepage URL
- at least one existing category slug
- at least one HTTPS source URL

Optional fields include a documentation URL, base URL, pricing information, authentication methods, and additional source references. Supported enum values are validated before any database connection is opened. Unknown JSON fields are rejected.

## Run a dry run

From the repository root:

```bash
cd services/catalogue-importer
go test ./...
go run ./cmd/catalogue-importer -input data/curated-starter-v1.json
```

Dry-run mode is the default. It validates the complete file and performs no database connection or writes.

## Apply an import

Only after a maintainer has reviewed the source links and confirmed the target database, ensure `DATABASE_URL_UNPOOLED` points to that intended APIVault database. The importer prefers this direct URL for its transactional batch write and falls back to `DATABASE_URL` for local development. Keep the pooled Neon `DATABASE_URL` for the application runtime.

```bash
cd services/catalogue-importer
go run ./cmd/catalogue-importer -input data/curated-starter-v1.json -apply -batch-size 100 -run-id starter-v1-2026-11-04
```

The importer prints only the database host and database name, never the connection string or credentials. It accepts up to 10,000 records per manifest (64 MiB input limit) and processes them in bounded transactions. The command's operation timeout is 30 minutes.

Do not use the placeholder example file against a real database.

## Data integrity

- Each batch and its checkpoint are committed or rolled back together.
- A failed run can be resumed with the same `-run-id`, input file, and batch size.
- Reusing a run ID with different input or batch size is rejected.
- Unknown category slugs fail the import.
- API records are imported as unverified or pending review, never verified.
- Source references are retained and updated idempotently.
- Existing API IDs are preserved when an API slug is updated.
- No schema migration is performed by this tool.

## Large-scale ingestion direction

The importer is a resumable first-stage ingestion tool, not yet a complete 200,000-record ingestion platform. It accepts up to 10,000 APIs per manifest, reads the manifest into memory (64 MiB maximum), and commits bounded batches. For larger source collections, split data into reviewed manifests and preserve the same dataset provenance. A future streaming adapter and source-specific connectors are still needed for sustained 200,000-record acquisition.

The 0.4.0 ingestion work now includes bounded batches, durable checkpoints, resumable runs, idempotent API upserts, dataset-level provenance, structured provider/name and cross-provider homepage conflict reports, secure evidence validation, and operator-visible run summaries. The admin moderation queue also prioritizes age, evidence gaps, metadata completeness, and possible duplicates while preserving human review. Remaining work before 0.4.0 can be called complete includes stronger database-backed recovery tests, contributor privacy regression coverage, and final end-to-end acceptance evidence. Each batch must retain source-dataset provenance and remain pending/unverified. A failed batch must be safely retried without duplicating records; a failed run must not silently skip records.

The 200,000 figure is a long-term target for distinct API products/services, not a release commitment. Source licenses, attribution, provider terms, data quality, database performance, and maintainer review capacity are release gates. See [the roadmap](../../../docs/ROADMAP.md#catalogue-scale-programme-directional-targets-not-release-guarantees) and [catalogue curation policy](../../../docs/CATALOGUE_CURATION.md#large-scale-catalogue-growth).


## Automated Go validation

Run the validator locally:

```bash
cd services/catalogue-importer
go test ./...
go run ./cmd/catalogue-validate -input data/curated-starter-v1.json -live=true -output validation-report.json
```

The GitHub Actions workflow statically validates both curated starter manifests on pull requests and performs weekly live HTTPS checks. Manual dispatch accepts a manifest path under `data/*.json`, so larger reviewed manifests can use the same pipeline. It checks metadata/schema, HTTPS source reachability, HTTP response status, provider/name duplicates, and cross-provider homepage collisions. URL checks are concurrency-limited, reject private/special-use DNS results, and pin outbound connections to the validated public IP to reduce DNS-rebinding risk. Machine-readable reports are uploaded as workflow artifacts.

A `VALIDATED_CANDIDATE` means the record passed automated structural and reachability checks and has official source references declared in its manifest. It does **not** prove domain ownership, license compatibility, accuracy of pricing/authentication claims, or API functionality. It never changes database verification or publication state. `REVIEW_REQUIRED` records are routed for human review; do not bulk-promote them.


## Dataset provenance

Every resumable import requires top-level `dataset` metadata: name, HTTPS source URL, version, RFC3339 retrieval timestamp, license declaration (use `NOASSERTION` when no blanket dataset license is asserted), and attribution. The importer persists these fields on the import run. Dataset metadata is included in the input fingerprint, so a run cannot be resumed with altered provenance.

The dataset-level license declaration does not override provider-specific rights or terms. Each API record must still retain its own official source evidence and applicable usage terms.


Verified catalogue records are protected from candidate-import downgrades: repeated imports preserve their verification state, featured flag, and operational status. Failed database status updates are surfaced rather than silently ignored.
