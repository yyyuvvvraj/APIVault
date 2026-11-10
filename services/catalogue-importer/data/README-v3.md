# Curated starter dataset v3

This dataset adds six API candidates to the existing v1 and v2 starter batches. The records are metadata candidates only; they are not imported, verified, or published by this change.

## Candidates

| API | Categories | Evidence included |
|---|---|---|
| USGS Earthquake Catalog API | Science & Education; Maps & Geospatial | USGS homepage, FDSN Event Web Service docs, developer resources |
| Crossref REST API | Science & Education; Data & Analytics | Crossref homepage, REST API docs, access/authentication |
| OpenAlex API | Science & Education; Data & Analytics | OpenAlex homepage, API reference, authentication and usage guidance |
| The Guardian Open Platform API | Media | Publisher homepage, API docs, access levels |
| Spotify Web API | Media | Developer portal, API docs, OAuth authorization, rate limits |
| OpenWeather API | Weather & Environment | Provider homepage, API catalogue, API key guide, pricing |

## Review and dry-run

Run the importer from this directory:

```bash
go test ./...
go run ./cmd/catalogue-importer -input data/curated-starter-v3.json
```

The importer runs in dry-run mode unless `-apply` is explicitly supplied. This PR does not run the importer against a database and does not use `-apply`.

## Publication boundary

Every record is marked `PENDING_REVIEW`. The dataset does not establish current operational availability, legal suitability, or API-specific terms beyond the cited provider material. Maintainers must inspect the official URLs, verify current metadata and category fit, resolve any unknowns, and complete the separate verification/publication process. Unknown pricing and terms remain explicitly unknown; no candidate is automatically promoted.
