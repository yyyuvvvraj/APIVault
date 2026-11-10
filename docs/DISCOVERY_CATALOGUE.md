# Full discovery catalogue

The full-catalogue evidence workflow produces a pinned, 2,284-record disposition
artifact. The separate DiscoveryLead table keeps those candidates out of the
verified Api catalogue and its public API.

## Import

1. Ensure the GitHub Actions repository secret DATABASE_URL points to the same
   PostgreSQL database used by the deployed APIVault application.
2. Run the **Full catalogue evidence processing** workflow on dev.
3. The **Import discovery catalogue** workflow automatically downloads the
   successful run's artifact, applies migrations, validates all 2,284 unique
   IDs, and idempotently upserts them into DiscoveryLead.
4. If needed, manually dispatch **Import discovery catalogue** with the source
   run ID and expected lead count.

The importer refuses incomplete or duplicate reports and rejects any record
that is import-eligible, verified, or published. It never writes to Api,
ApiProvider, or ApiSource.

## Website

The /discover page exposes the discovery queue with search, priority, category,
and review-status filters. The existing /apis page and /api/v1/apis endpoint
continue to expose only active, verified, published listings.
