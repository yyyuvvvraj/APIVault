# Provider evidence review workflow

The provider evidence review pipeline converts a discovery-only review queue into a structured evidence submission for a maintainer to inspect. It is deliberately separate from catalogue import, API verification, and publication.

## Workflow

1. Run **Catalogue discovery leads** and download the `apivault-discovery-leads-*` artifact.
2. Use the generated `apivault-review-pack-page-1.json` and copy the `reviewId` for each candidate being researched.
3. Copy [evidence-review-template.json](../services/catalogue-importer/data/evidence-review-template.json) into `services/catalogue-importer/data/evidence-review/<batch-name>.json`.
4. Replace every placeholder using provider-controlled sources. Record the provider's domain or domains, homepage, API documentation, terms, licensing assessment, authentication, pricing, and evidence URLs with the date each source was accessed.
5. Commit the completed evidence pack in a pull request. The **Catalogue provider evidence review** workflow runs the Go tests, checks formatting, validates every committed pack, and uploads machine-readable findings.
6. A maintainer independently inspects the linked sources and decides whether to prepare a separate curated import PR. The evidence validator never imports, verifies, or publishes catalogue records.

## Evidence rules

- The `reviewId` must come from the discovery review pack; do not invent one.
- `providerDomains` is an explicit allowlist of provider-controlled domains. A URL must use HTTPS, contain no embedded credentials, and match one of those domains or its subdomains.
- Domain matching is a structural guardrail, not proof of ownership. The maintainer must independently confirm that each domain belongs to the named provider.
- Required claims are `PROVIDER_IDENTITY`, `OFFICIAL_HOMEPAGE`, and `DOCUMENTATION`. Add `TERMS_LICENSE`, `AUTHENTICATION`, and `PRICING` evidence whenever those fields are asserted as known.
- Evidence marked `THIRD_PARTY` is retained for context but cannot satisfy an official-evidence requirement.
- Keep unknown facts as `UNKNOWN`; do not infer a license, authentication requirement, or pricing model from a directory listing.
- Evidence URLs and access timestamps are provenance. They do not prove that the page was accurate, current, or genuinely controlled by the provider.

## Status semantics

- `READY_FOR_MAINTAINER_REVIEW`: structurally complete and suitable for human inspection only.
- `BLOCKED`: required fields or qualifying evidence are missing or structurally invalid.

A READY result is not an APIVault verification result and must never be counted as an ACTIVE, VERIFIED, published API. The validator has no database connection, credentials, network fetching, import operation, or publication side effect.

## Local validation

From the repository root:

```bash
cd services/catalogue-importer
go test ./...
go run ./cmd/catalogue-evidence-review \
  -input data/evidence-review/<batch-name>.json \
  -output evidence-review-report.json
```

The command writes a report even when submissions are blocked, so researchers can see every issue. CI requires every committed evidence pack to contain at least one submission and have zero blocked findings.

## Schema values

- `licenseAssessment`: `ALLOWED`, `RESTRICTED`, or `UNKNOWN`.
- `authentication`: `NONE`, `API_KEY`, `OAUTH2`, `OTHER`, or `UNKNOWN`.
- `pricing`: `FREE`, `PAID`, `FREEMIUM`, `USAGE_BASED`, or `UNKNOWN`.
- Evidence `sourceType`: `PROVIDER_CONTROLLED` or `THIRD_PARTY`.
- Evidence `claim`: `PROVIDER_IDENTITY`, `OFFICIAL_HOMEPAGE`, `DOCUMENTATION`, `TERMS_LICENSE`, `AUTHENTICATION`, `PRICING`, `RATE_LIMITS`, or `API_AVAILABILITY`.
