# Discovery sources and provenance

The discovery extractor can read the community-maintained
[public-apis directory](https://github.com/public-apis/public-apis) and emit
candidate links for manual review.

## Important limitations

- Every extracted item is labelled `DISCOVERY_ONLY`.
- The directory is community-maintained and is not authoritative provider evidence.
- A directory entry does not prove that a URL is the provider's official API page.
- The upstream repository's MIT license applies to that repository's contributions;
  it does not grant rights to provider documentation, API data, trademarks, or services.
- Review each provider's terms, documentation license, pricing, authentication,
  rate limits, availability, and attribution requirements independently.
- Never import or publish the generated discovery report directly.

Always record the immutable upstream commit SHA and the directory URL alongside
the generated candidates so the discovery input can be reproduced.

## Automated refresh

The GitHub Actions workflow `Catalogue discovery leads` refreshes this source weekly and on manual dispatch. Each report pins the upstream README commit SHA and is retained as a workflow artifact for 30 days. The report is a reproducible research queue only; it does not write to the APIVault database or authorize publication.

A maintainer or a future provider-source enrichment process must independently establish the official provider homepage, API documentation, usage terms, authentication, pricing, and attribution before creating an import manifest.


## Discovery triage output

The discovery workflow also runs the Go `catalogue-triage` command and uploads a second JSON report beside the raw discovery snapshot. The triage report preserves the original URL and provenance, derives a canonical URL by removing only known marketing tracking parameters, flags exact URL/name/hostname collisions, and suggests a target category only for explicitly mapped source categories.

A shared hostname is not automatically a duplicate: one provider can operate multiple distinct APIs. Category suggestions are not evidence. Every candidate remains `DISCOVERY_ONLY` and `REVIEW_REQUIRED`; the triage output is not compatible with the database importer and performs no database writes or publication. Use it to prioritize provider-owned source research and prepare a separately reviewed manifest.
