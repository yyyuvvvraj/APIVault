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
