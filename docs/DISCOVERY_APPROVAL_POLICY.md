# Discovery approval policy

## Current safety boundary

The 2,284 imported DiscoveryLead records are unverified research candidates. The
research artifact is not sufficient to create a verified or published API record.

The deterministic policy in `src/lib/catalogue/discovery-approval-policy.ts`
checks six observable conditions:

1. A non-empty API name and valid HTTP(S) source URLs without embedded credentials.
2. An HTTPS canonical provider URL.
3. A successful 2xx research fetch.
4. The final resolved page remains on the canonical HTTPS hostname.
5. The fetched page has a title and description.
6. At least one HTTPS documentation link is found on the canonical hostname.

A lead passes only into `READY_FOR_MAINTAINER_REVIEW`. The score is a research
completeness score, not a probability that the API is legitimate.

## What this policy cannot establish

A landing page and a documentation link do not prove that an API is functional,
owned by the claimed provider, currently available, safe to call, or usable under
its terms. The current discovery snapshot does not independently prove endpoint
health, authentication behavior, rate limits, pricing, terms, or data licensing.

Therefore this policy always returns `requiresHumanApproval: true` and
`mayPublish: false`. It must not mutate Api, VerificationStatus, or
publishedAt. It must not treat HTTP 200 as API verification.

## Requirements before machine approval can be enabled

A later approval executor must require independently collected, timestamped
evidence for:

- Provider identity and official-domain ownership/corroboration.
- Documentation that describes an actual API and its base URL or endpoint.
- A safe, read-only endpoint probe with an expected response contract, or a
  documented reason why probing is unavailable.
- Authentication requirements and rate-limit behavior where documented.
- Pricing and terms links, including explicit unknown/unavailable states.
- Duplicate identity checks against existing providers and APIs.
- Evidence freshness and repeatable checks.

The executor must use an allowlisted, rate-limited HTTP client; block private,
loopback, link-local and cloud metadata IP ranges; re-check DNS after redirects;
limit response size and time; never submit credentials or mutate provider data;
and retain the full evidence and decision audit trail.

Even after these controls exist, automatic publication should remain a separate
explicit policy. A verification decision and a publication decision are not the
same operation.
