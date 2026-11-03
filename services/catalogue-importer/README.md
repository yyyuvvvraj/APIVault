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

See [examples/catalogue.example.json](examples/catalogue.example.json). Replace all placeholder URLs and descriptions with reviewed, official information before importing.

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
go run ./cmd/catalogue-importer -input examples/catalogue.example.json
```

Dry-run mode is the default. It validates the complete file and performs no database connection or writes.

## Apply an import

From the repository root, ensure `DATABASE_URL` points to the intended APIVault database. Use the pooled Neon URL for ordinary runtime operations.

```bash
cd services/catalogue-importer
DATABASE_URL="$DATABASE_URL" go run ./cmd/catalogue-importer -input examples/catalogue.example.json -apply
```

The importer prints only the database host and database name, never the connection string or credentials. It processes at most 500 APIs per file and uses a two-minute operation timeout.

Do not use the placeholder example file against a real database. Prepare and review a real catalogue file first.

## Data integrity

- The entire file is committed or rolled back as one transaction.
- Unknown category slugs fail the import.
- API records are imported as unverified or pending review, never verified.
- Source references are retained and updated idempotently.
- Existing API IDs are preserved when an API slug is updated.
- No schema migration is performed by this tool.
