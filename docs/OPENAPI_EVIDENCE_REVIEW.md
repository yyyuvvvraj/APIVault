# OpenAPI contract evidence review

APIVault can inspect a locally supplied OpenAPI 3.x or Swagger 2.0 JSON
document without making network requests.

```sh
cd services/catalogue-importer
go run ./cmd/catalogue-openapi-review \
  -input /path/to/openapi.json \
  -provider-domains example.com,api.example.com \
  -output openapi-analysis.json
```

The analyzer checks document shape, API title/version, at least one path, and
an HTTPS server URL whose hostname is equal to or a subdomain of a declared
provider-controlled domain. It rejects malformed JSON, oversized documents,
HTTP servers, credentials in server URLs, and lookalike domains.

This is deliberately an offline structural check. It does not download a
specification, resolve DNS, call endpoints, authenticate provider ownership,
establish that a server is live, or assess terms, pricing, authentication, or
license compatibility. A provider-domain list is an input assertion, not
independent proof of domain ownership. The result is evidence for a later
review stage only; it never creates, verifies, or publishes an API.

YAML specifications are not accepted by this first version. Convert a
provider-supplied YAML document to JSON with a trusted local tool before
analysis; do not paste untrusted YAML into an automated execution context.
