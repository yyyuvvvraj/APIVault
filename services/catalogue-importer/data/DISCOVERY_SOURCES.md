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
