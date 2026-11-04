# Catalogue discovery and search

## Search behavior

The catalogue search treats each whitespace-separated term as required. Each term may match an API name or slug, provider name or slug, category name or slug, tag name or slug, summary, or description. Terms can match different fields on the same API; for example, `weather open-meteo` can match a category and provider together.

Search is case-insensitive, trims and collapses whitespace, caps the input at 100 characters, removes duplicate terms, and considers at most eight terms. Search terms are combined with the selected category, pricing, and authentication filters using AND semantics.

## Relevance order

The default sort ranks exact API-name matches first, followed by API-name prefixes and phrase matches, provider matches, slug/category/tag matches, and broader summary/description matches. Featured status, verification date, update date, and API name provide deterministic tie-breakers. Explicit sort choices (recently updated, recently verified, newest, and name) remain unchanged.

For correctness, relevance sorting ranks the complete filtered result set before pagination. If the catalogue grows to a scale where loading all matching records is expensive, move this ranking into a database-native search index before increasing catalogue volume substantially.

## Public visibility

Public listings and detail lookups require `ACTIVE` lifecycle status, `VERIFIED` verification status, a publication timestamp, HTTPS homepage and documentation URLs, at least one category, an explicit authentication-method record, and an official HTTPS source explicitly classified as `OFFICIAL_HOMEPAGE`. An unrelated official documentation or pricing URL cannot stand in for evidence of the API homepage. Starter imports remain `PENDING_REVIEW`; the importer cannot publish or feature records. Maintainers must review official sources and approve records through the existing verification workflow before they appear publicly.
