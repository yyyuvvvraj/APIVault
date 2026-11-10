# Curating the APIVault starter catalogue

The curated candidate catalogue is maintained as two reviewable batches: [v1](../services/catalogue-importer/data/curated-starter-v1.json) and [v2](../services/catalogue-importer/data/curated-starter-v2.json). Together they contain thirteen candidates; neither file is an instruction to publish records.

## Curation rules

- Prefer provider-owned homepages, API references, authentication pages, pricing pages, and rate-limit pages.
- Every imported API must include at least one official HTTPS source. Add separate sources for material authentication, pricing, and rate-limit claims.
- Use `UNKNOWN` rather than guessing a pricing model, authentication requirement, or operational detail.
- Keep imported entries at `PENDING_REVIEW` or `UNVERIFIED`. The importer deliberately cannot set `VERIFIED`.
- Do not set `featured` on imported entries. Featured placement is a maintainer decision after review.
- Respect provider usage policies. A public endpoint is not automatically suitable for bulk collection or high-volume commercial use.
- Re-check official sources before changing pricing, authentication, rate limits, or lifecycle status. Update source notes and the review record in the same pull request.
- Never add API keys, access tokens, private credentials, or example secrets to catalogue data.

## Starter dataset

The v1 batch contains five entries and v2 adds eight more across developer tools, finance, science and education, weather, data, media, and geospatial services. Both batches are review queues, not assertions that the records have completed APIVault verification.

| API | Main category | Review focus |
|---|---|---|
| Open-Meteo Weather API | Weather & Environment | Non-commercial free tier, commercial subscriptions, attribution |
| NASA Open APIs | Science & Education | Key registration and service-specific limits |
| GitHub REST API | Developer Tools | Endpoint-specific permissions and authenticated rate limits |
| Open Library APIs | Science & Education | Fair-use policy, caching, and request identification |
| Frankfurter Exchange Rates API | Finance | Public endpoint and current v2 documentation |

## Validate before applying

From the repository root:

```bash
cd services/catalogue-importer
go test ./...
go run ./cmd/catalogue-importer -input data/curated-starter-v1.json
go run ./cmd/catalogue-importer -input data/curated-starter-v2.json
```

The importer defaults to dry-run and performs no database writes. CI validates both batches in dry-run mode on every pull request. The curated file should only be applied after a maintainer has reviewed its source links and confirmed that the target database is the intended environment.

To apply after review, use the documented `-apply` flag and `DATABASE_URL_UNPOOLED` for the intended database. Do not apply the placeholder file under `examples/`. Public publication additionally requires an explicit maintainer verification, publication timestamp, documentation URL, category, authentication classification, and official HTTPS source evidence.

## Large-scale catalogue growth

The long-term directional target is 200,000 distinct API products/services, not 200,000 URL paths. This is not a promise to publish 200,000 entries or a fixed delivery date.

### Source acceptance
- Prefer provider-maintained directories, official API catalogues, and datasets with explicit reuse terms.
- Record the dataset name, source URL, retrieval date, license/terms, attribution requirements, and source version for every ingestion batch.
- Reject sources whose license or provider terms do not permit the intended collection and redistribution.
- Do not bypass authentication, rate limits, robots controls, or access restrictions.
- Treat third-party community lists as discovery leads, not proof of official API facts.

### Candidate quality
- Deduplicate by canonical homepage, provider identity, normalized API name, and documented aliases; ambiguous matches go to human review.
- Store source provenance and field-level evidence. Unknown pricing, authentication, rate limits, and availability stay unknown.
- Imported records remain pending/unverified. Ingestion cannot publish, feature, or verify a record.
- Count distinct API products/services. Do not inflate counts with endpoints, versions, SDKs, mirrors, or duplicate provider listings.

### Scale gates
- Prove the pipeline with 1,000 candidates before expanding to 10,000.
- Demonstrate resumable ingestion, duplicate reporting, and review throughput at 10,000.
- Load-test PostgreSQL queries, indexes, and public pagination at 50,000.
- Consider the 200,000 target only after licensing, source refresh, moderation capacity, and operating cost are understood.

### Automated discovery intake

The **Catalogue discovery leads** workflow runs weekly and can also be started manually. It resolves the latest upstream README commit, pins that immutable 40-character revision, extracts category-grouped Markdown entries with the Go discovery parser, and uploads a reproducible JSON artifact.

This workflow is discovery-only: it does not connect to the APIVault database, create providers, import API records, or change verification/publication state. Every lead remains `DISCOVERY_ONLY`. The community directory is a lead source, not provider-owned evidence. Use the artifact to prioritize independent provider-source research and prepare a separately reviewed manifest. Never turn the discovery artifact directly into a publishable catalogue import.

The automated verification export also reports lifecycle and evidence-coverage counts (total APIs, pending/unpublished records, HTTPS homepage/documentation coverage, category coverage, source coverage, and authentication classification). These diagnostics make an empty verification batch explainable instead of silently reporting only zero candidates.


### Provider evidence review

Use the [provider evidence review workflow](CATALOGUE_EVIDENCE_REVIEW.md) to convert discovery-only review IDs into structured, source-linked research submissions. A structurally READY submission is still awaiting independent maintainer review and cannot be imported, verified, published, or counted toward release eligibility.
