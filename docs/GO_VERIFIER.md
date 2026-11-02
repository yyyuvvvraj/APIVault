# Go API verifier worker

## Responsibility and trust boundary

The Go service is an independent background worker. It does not own the catalogue database and cannot directly change an API's verification or publication state.

The Next.js application remains the control plane and source of truth. The worker communicates only through authenticated internal endpoints:

- `GET /api/internal/verifier/jobs` returns bounded pages of active API IDs and homepage URLs.
- `POST /api/internal/verifier/results` persists a health observation.

Both endpoints require a bearer token matching `VERIFIER_SHARED_SECRET`. The secret must be at least 32 characters, must be kept out of source control, and should be rotated if exposed.

## What it checks

The worker sends HTTP HEAD requests to official homepage URLs and falls back to a small ranged GET when the server does not support HEAD. It records reachability, HTTP status, latency, and a bounded error message in `ApiHealthCheck`.

A health observation is not verification evidence. A successful HTTP response never automatically verifies or publishes an API. Maintainers continue to review official sources through the existing admin lifecycle.

## SSRF protections

Catalogue URLs are untrusted input. The worker:

- Allows only HTTP and HTTPS.
- Rejects URL credentials and invalid ports.
- Rejects loopback, private, link-local, multicast, unspecified, and reserved IP ranges.
- Resolves hostnames at connection time and rejects DNS answers containing non-public IP addresses.
- Disables redirects so a public URL cannot redirect the worker to a private network.
- Applies connection, response-header, and total request timeouts.
- Uses bounded concurrency and does not download response bodies for HEAD requests.

Review these controls before changing URL handling or adding request headers. Never add support for arbitrary user-supplied headers, ports, or internal network destinations.

## Local development

Set the following values in the gitignored `.env` file:

```env
VERIFIER_SHARED_SECRET=replace-with-a-random-secret-at-least-32-characters
APIVAULT_INTERNAL_URL=http://host.docker.internal:3000
VERIFIER_SCAN_INTERVAL=30m
VERIFIER_CONCURRENCY=8
```

Start PostgreSQL and the Next.js application first. Then start the optional worker profile:

```bash
docker compose --profile workers up --build verifier
```

The worker exposes a liveness endpoint at `http://localhost:8081/healthz`. It performs an initial scan at startup and repeats at the configured interval. Concurrency is limited to 1–32 workers.

For local Go tests:

```bash
cd services/verifier
go test -race -cover ./...
go vet ./...
go build ./cmd/verifier
```

## Container images

The Next.js app and Go worker use multi-stage Alpine-based images. The Go runtime image contains only the statically linked verifier binary, CA certificates, and timezone data. The Next.js image keeps build tools and development dependencies in earlier stages and runs as a non-root user in the final stage.

Alpine is used for runtime size, but CI must continue to build and smoke-test the images. Do not remove OpenSSL or compatibility libraries from the Node image without confirming Prisma and Next.js runtime behavior on the target architecture.
