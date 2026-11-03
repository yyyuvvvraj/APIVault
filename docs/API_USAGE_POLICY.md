# Public API Usage Policy

This document describes the intended use of APIVault's public, read-only REST API. It is operational guidance, not a service-level agreement or a grant of rights to third-party API providers' content.

## Scope

The public API currently exposes catalogue data through these versioned endpoints:

- GET /api/v1/apis — browse and filter catalogue entries.
- GET /api/v1/apis/{slug} — retrieve one catalogue entry.
- GET /api/v1/categories — list catalogue categories.

The API is read-only. It does not proxy requests to listed providers, issue provider credentials, or guarantee that a listed third-party API is available.

## Rate limits

The current application-level limit is **120 requests per client IP per 60-second fixed window** for public API requests.

Responses include rate-limit headers so clients can understand the current window and remaining allowance. Clients should:

- Respect the returned limit and reset information.
- Treat HTTP 429 Too Many Requests as a signal to pause and retry only after the indicated reset.
- Use exponential backoff with jitter for transient failures.
- Avoid rotating IP addresses, distributing traffic, or otherwise attempting to evade limits.
- Cache responses where practical rather than repeatedly requesting unchanged catalogue data.

The numeric limit is an implementation setting, not a capacity promise. APIVault may adjust limits, apply additional protections, or temporarily restrict traffic to protect the service. No particular throughput or uninterrupted access is guaranteed.

## Caching and conditional requests

Successful catalogue responses provide cache directives. Clients and intermediaries should follow the response's Cache-Control header rather than assuming a fixed freshness period.

The API also supports entity tags (ETags). Store an ETag from a response and send it on a later request using If-None-Match. When the representation has not changed, the server may return 304 Not Modified without a response body. A 304 response should be handled using the previously cached representation.

Do not assume that cache lifetimes or ETag values remain constant across releases.

## Attribution

When displaying, republishing, or incorporating APIVault catalogue data in an application, provide clear attribution such as:

> API catalogue data from [APIVault](https://github.com/yyyuvvvraj/APIVault).

Linking to the relevant APIVault catalogue entry is encouraged when one is available. Preserve source links and verification context included with catalogue records. Attribution to APIVault does not replace any attribution, licence, or terms required by the original API provider.

## Fair use

Use the public API in a way that is proportionate to the task and does not impair access for others. In particular:

- Prefer pagination and filters over repeatedly downloading the full catalogue.
- Cache data and refresh it according to the response cache directives.
- Do not conduct denial-of-service testing, vulnerability scanning, or load testing against the public service without prior written authorization.
- Do not attempt to bypass authentication, rate limits, access controls, or other safeguards.
- Do not misrepresent catalogue entries, verification status, or provider relationships.
- Do not use APIVault as a proxy or relay for requests to third-party providers.

APIVault may throttle or block traffic that threatens service stability, violates these expectations, or appears abusive.

## Data accuracy and third-party services

APIVault aims to curate useful API information, but catalogue records may be incomplete, outdated, or incorrect. Verification indicates that a record was reviewed under the project's verification process; it is not an endorsement or a guarantee of provider quality, security, uptime, pricing, or continued availability.

Always review the linked provider's official documentation and terms before integrating an API. Provider terms, licences, privacy policies, and usage limits apply independently of this policy.

## Availability and changes

The public API is provided without an uptime or support-level commitment. Endpoints, response fields, limits, and caching behaviour may change as the project evolves. Breaking changes should be communicated through the repository's release notes and API documentation where reasonably practicable.

For questions or to report a suspected issue, use the project's [GitHub Discussions](https://github.com/yyyuvvvraj/APIVault/discussions) or [issue tracker](https://github.com/yyyuvvvraj/APIVault/issues). For security-sensitive reports, follow [SECURITY.md](../SECURITY.md).

## Policy updates

This policy may be revised as the public API matures. The version in the repository's default integration branch is the current published guidance; check this document periodically for changes.
