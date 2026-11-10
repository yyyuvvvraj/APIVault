# Curated starter dataset v4

This dataset adds six API candidates to the v1-v3 starter batches. The records are metadata candidates only; they are not imported, verified, or published by this change.

## Candidates

| API | Categories | Evidence focus |
|---|---|---|
| World Bank Indicators API | Data & Analytics; Science & Education | Indicators API v2, query structure |
| openFDA API | Science & Education; Data & Analytics | API reference, free key, rate limits, terms and disclaimer |
| Europe PMC REST API | Science & Education; Data & Analytics | REST service, search and result formats |
| Google Books API | Media; Science & Education | Volumes API, API keys, OAuth |
| YouTube Data API v3 | Media | API reference, API key/OAuth split, quota |
| U.S. Census Data API | Data & Analytics; Science & Education | Developer portal, current API key guidance |

## Review and dry-run

Run from `services/catalogue-importer`:

```bash
go test ./...
go run ./cmd/catalogue-importer -input data/curated-starter-v4.json
```

The importer runs in dry-run mode unless `-apply` is explicitly supplied. This change does not execute the importer against a database.

## Publication boundary

Every record is marked `PENDING_REVIEW`. Official documentation links are evidence starting points, not proof of legal suitability, operational availability, or complete metadata. Reviewers must confirm current endpoints, authentication, quotas, licensing, terms, data rights, and category fit. Unknown pricing and terms remain explicitly unknown. No candidate is automatically promoted, imported, verified, or published.
