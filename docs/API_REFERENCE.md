# Developer API reference

APIVault exposes a read-only, versioned catalogue API. It returns catalogue metadata; it does not proxy requests to third-party providers.

- Base path: `/api/v1`
- Authentication: anonymous requests are supported. Optional APIVault keys identify integrations.
- Content type: JSON.
- Public routes: `GET /api/v1/apis`, `GET /api/v1/apis/{slug}`, and `GET /api/v1/categories`.

## List and paginate

Use `page` and `limit` to move through results. The maximum page size is 50.

```bash
curl --get 'https://YOUR_APIVAULT_HOST/api/v1/apis' \
  --data-urlencode 'q=weather' \
  --data-urlencode 'category=weather-environment' \
  --data-urlencode 'pricing=FREEMIUM' \
  --data-urlencode 'auth=API_KEY' \
  --data-urlencode 'sort=verified' \
  --data-urlencode 'page=1' \
  --data-urlencode 'limit=20' \
  --header 'Accept: application/json'
```

Filters compose: when multiple filters are supplied, a record must satisfy all of them. Supported sort values are `relevance`, `recent`, `verified`, `newest`, and `name`. Pricing values are `FREE`, `FREEMIUM`, `PAID`, `OPEN_SOURCE`, and `UNKNOWN`. Authentication values are `API_KEY`, `OAUTH2`, `BEARER_TOKEN`, `BASIC_AUTH`, `NONE`, `CUSTOM`, and `UNKNOWN`.

A successful list response contains `data` and `pagination`:

```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

## Retrieve one API

```bash
curl 'https://YOUR_APIVAULT_HOST/api/v1/apis/nasa-open-apis' \
  --header 'Accept: application/json'
```

The detail response is wrapped in `data`. Only active, verified, publication-ready catalogue entries are exposed.


## Discovery leads (research-only)

The separate `GET /api/v1/discovery` endpoint exposes the public discovery queue. These records are **not** verified or published API listings, and this endpoint does not proxy third-party APIs.

```bash
curl --get 'https://YOUR_APIVAULT_HOST/api/v1/discovery' \
  --data-urlencode 'q=weather' \
  --data-urlencode 'priority=HIGH' \
  --data-urlencode 'page=1' \
  --data-urlencode 'limit=30' \
  --header 'Accept: application/json'
```

Parameters: `q` searches names, URLs and categories (maximum 100 characters); `priority` accepts `HIGH`, `NORMAL`, or `LOW`; `disposition` accepts `READY_FOR_MAINTAINER_REVIEW` or `REVIEW_REQUIRED`; `page` is 1-based; `limit` is 1–100 (default 30).

Responses include `data`, `counts`, `pagination`, and a safety `notice`. Records retain `UNVERIFIED`, `NOT_PUBLISHED`, and `humanReviewRequired: true`. Automated research and candidate URLs are not authenticated provider evidence. Do not use these records as an integration catalogue or claim their APIs are available.

The human-facing queue is at [/discover](/discover). The verified catalogue remains at [/apis](/apis) and `GET /api/v1/apis`.

## JavaScript example

```js
const url = new URL("/api/v1/apis", "https://YOUR_APIVAULT_HOST");
url.search = new URLSearchParams({ q: "weather", page: "1", limit: "20" });

const response = await fetch(url, {
  headers: { Accept: "application/json" },
  signal: AbortSignal.timeout(10_000),
});

if (!response.ok) {
  const problem = await response.json().catch(() => ({}));
  throw new Error(problem.message ?? `APIVault request failed: ${response.status}`);
}

const { data, pagination } = await response.json();
console.log(data, pagination);
```

## Python example

```python
import requests

response = requests.get(
    "https://YOUR_APIVAULT_HOST/api/v1/apis",
    params={"q": "weather", "page": 1, "limit": 20},
    headers={"Accept": "application/json"},
    timeout=10,
)
response.raise_for_status()
payload = response.json()
print(payload["data"])
print(payload["pagination"])
```

## Conditional requests and caching

Successful catalogue responses include an `ETag` and `Cache-Control` header. Save the ETag and send it as `If-None-Match` on a later request. A `304 Not Modified` response has no body; reuse the representation you already cached.

```bash
curl 'https://YOUR_APIVAULT_HOST/api/v1/apis?page=1&limit=20' \
  --header 'If-None-Match: "ETAG_FROM_PREVIOUS_RESPONSE"'
```

Follow the actual `Cache-Control` value rather than assuming a fixed cache lifetime. Do not assume ETags remain unchanged across releases.

## Response metadata and errors

Inspect these headers when present:

- `ETag` and `Cache-Control`: conditional requests and caching.
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`: current rate-limit window.
- `Retry-After`: wait duration after a 429 response.
- `X-Request-Id`: request correlation when supplied by the host.

Errors use a JSON object with a machine-readable `error` code and a human-readable `message`:

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests from this client. Please wait before retrying."
}
```

| Status | Meaning | Client action |
|---|---|---|
| 400 | Invalid query or request | Correct the supplied parameters |
| 401 | Supplied API key is invalid, expired, or revoked | Rotate or remove the key |
| 404 | No published API matches the slug | Check the slug |
| 429 | Rate limit reached | Wait for `Retry-After` or reset, then retry with backoff |
| 500 | Unexpected application error | Retry cautiously; report persistent failures |
| 503 | Catalogue or dependency unavailable | Retry later with bounded backoff |

Use exponential backoff with jitter for transient failures. Do not retry a 400 or 401 unchanged, and do not attempt to evade rate limits by rotating IP addresses or credentials.

## Optional APIVault API keys

Create and manage keys from the signed-in account's **API keys** page. A key:

- Is shown only once at creation. Copy it immediately and store it in a secret manager.
- Is stored server-side as a SHA-256 hash; APIVault cannot display the original secret again.
- Has the read-only `catalogue:read` scope. There are no write-capable public API keys.
- Can expire after 30, 90, or 365 days, or be created without an expiry.
- Can be revoked from the account page. Revocation takes effect on subsequent authentication checks.
- Is subject to a maximum of 10 active keys per account and a creation limit of 5 keys per hour.

Send a key with either supported header:

```bash
curl 'https://YOUR_APIVAULT_HOST/api/v1/apis' \
  --header 'Authorization: Bearer av_live_YOUR_SECRET'
# Alternatively: --header 'X-API-Key: av_live_YOUR_SECRET'
```

Never embed an APIVault key in browser JavaScript, a public repository, a mobile app bundle, or client-side playground code. Use a server-side secret store. A valid key does not increase the default 120 requests per client IP per 60-second window; keyed requests are subject to both the client-IP and per-key limits. Anonymous access remains available.

## Playground

The interactive playground on `/docs` calls only the current APIVault host's public GET routes. After a request, it shows the request URL, response status, elapsed time, response size, selected response headers, and JSON body. Its cURL command is anonymous by design; add a key only in a trusted server-side environment.

## Contract and compatibility

The machine-readable OpenAPI 3.1 document is available at `/openapi.json` and in [openapi.json](openapi.json). The API path version (`/api/v1`) is independent of the APIVault application release version.

The project does not publish generated language SDKs in this milestone. The cURL, JavaScript, and Python examples above are maintained against the OpenAPI contract; do not treat them as a separately versioned SDK. Breaking API changes require an explicit compatibility decision and release communication.
