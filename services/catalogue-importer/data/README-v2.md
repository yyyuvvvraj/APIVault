# Curated starter dataset v2

This dataset adds eight API candidates to the five records in v1. It is deliberately separate from the original starter file so operators can review the delta.

## Import and review

Run the catalogue importer in dry-run mode first. Review the importer output and every official source URL. Apply only after a maintainer has reviewed the dataset. All records use `PENDING_REVIEW`; the importer must not promote records to public visibility.

```bash
cd services/catalogue-importer
go run ./cmd/catalogue-importer -input data/curated-starter-v2.json
```

For a database write, use the documented `-apply` flag and a Neon direct/unpooled connection supplied through the shell environment. Do not paste credentials into chat, command history, or repository files.

## Candidates

| API | Category | Evidence to review |
|---|---|---|
| JSONPlaceholder | Developer tools | Homepage and guide |
| REST Countries | Data & analytics; science | Project homepage |
| PokéAPI | Science & education; developer tools | Homepage and v2 docs |
| DummyJSON | Developer tools | Homepage and docs |
| CoinGecko API | Finance; data & analytics | Current authentication, plan, and rate-limit terms |
| Open Food Facts | Data & analytics; science | API docs, database licence, and fair-use policy |
| Wikimedia REST API | Media; science | API docs, user-agent guidance, and reuse policy |
| GeoNames Web Services | Maps & geospatial; data & analytics | Username requirements and current service limits |

## Quality rule

A candidate is not a published catalogue listing. Maintainers must confirm canonical URLs, terms, auth methods, pricing, limits, provider attribution, categories, and current availability. Unknown values must remain unknown. Public visibility remains restricted to ACTIVE + VERIFIED records.
