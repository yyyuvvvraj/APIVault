# APIVault Go Catalogue Importer

A dry-run-first Go CLI for importing API catalogue records into the existing APIVault PostgreSQL schema.

## Responsibilities

- Uses PostgreSQL through `pgx/v5`.
- Imports providers, APIs, category links, authentication methods, source references, and revision history.
- Uses one database transaction for the complete file. Any invalid category or database error rolls the entire import back.
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
go run ./cmd/catalogue-importer -input data/curated-starter-v1.json -apply
```

The importer prints only the database host and database name, never the connection string or credentials. It processes at most 500 APIs per file and uses a two-minute operation timeout.

Do not use the placeholder example file against a real database.

## Data integrity

- The entire file is committed or rolled back as one transaction.
- Unknown category slugs fail the import.
- API records are imported as unverified or pending review, never verified.
- Source references are retained and updated idempotently.
- Existing API IDs are preserved when an API slug is updated.
- No schema migration is performed by this tool.

## Large-scale ingestion direction

The current importer is a safe starter tool, not yet a 200,000-record ingestion engine. It accepts at most 500 APIs per JSON file, reads the complete file into memory, and applies one transaction for the whole batch. Do not simply raise the limit to 200,000: that would create oversized transactions, poor failure recovery, and difficult review.

The 0.4.0 ingestion work will introduce bounded batches, durable checkpoints, resumable runs, idempotent processing, structured duplicate/conflict reporting, and import summaries. Each batch must retain source-dataset provenance and remain pending/unverified. A failed batch must be safely retried without duplicating records; a failed run must not silently skip records.

The 200,000 figure is a long-term target for distinct API products/services, not a release commitment. Source licenses, attribution, provider terms, data quality, database performance, and maintainer review capacity are release gates. See [the roadmap](../../../docs/ROADMAP.md#catalogue-scale-programme-directional-targets-not-release-guarantees) and [catalogue curation policy](../../../docs/CATALOGUE_CURATION.md#large-scale-catalogue-growth).
