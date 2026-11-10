# API discovery sources

## Public APIs community directory

- Repository: https://github.com/public-apis/public-apis
- Source format: category-grouped Markdown tables
- Repository license: MIT; retain the upstream copyright and license notice when redistributing substantial portions of the directory.
- Example pinned upstream revision reviewed for this connector: `88706670ac0ffaad7bf3c6307747e2515f638bed`.
- The repository is a community-maintained discovery index, not an authoritative source for provider terms or operational claims.

Generate a discovery-only JSON report:

```bash
cd services/catalogue-importer
go run ./cmd/catalogue-discover \
  -input /path/to/public-apis/README.md \
  -revision 88706670ac0ffaad7bf3c6307747e2515f638bed \
  -output public-apis-discovery.json
```

The output preserves the upstream category, listing name, description, homepage link, directory URL, and immutable source revision. It labels every record `DISCOVERY_ONLY`.

**Do not feed the generated report directly to the catalogue importer.** Each candidate still needs independent provider-owned HTTPS evidence, identity/duplicate review, rights and terms review, current pricing/authentication/rate-limit checks, and maintainer approval. A directory's MIT license does not grant rights to provider APIs, provider documentation, or their data. Candidate discovery never verifies or publishes APIVault records.
