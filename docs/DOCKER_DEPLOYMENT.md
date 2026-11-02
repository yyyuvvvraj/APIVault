# Docker build and deployment

## What GitHub Actions does

The workflow at `.github/workflows/docker-publish.yml` has two modes:

- Pull requests targeting `dev` or `stable`: build an amd64 image and run a container smoke test. The image is not published.
- Pushes to `dev`, `stable`, and version tags matching `v*`: build and publish a multi-platform image (amd64 and arm64) to GitHub Container Registry (GHCR).

The workflow uses the repository-provided `GITHUB_TOKEN`; no Docker Hub account or long-lived registry password is required.

## Image names

For this repository, the image is:

```text
ghcr.io/yyyuvvvraj/apivault:dev
ghcr.io/yyyuvvvraj/apivault:stable
ghcr.io/yyyuvvvraj/apivault:latest
ghcr.io/yyyuvvvraj/apivault:v1.0.0
ghcr.io/yyyuvvvraj/apivault:sha-<commit>
```

The `latest` tag is emitted only from `stable`. Version tags (for example `v1.0.0`) receive matching image tags. The exact commit SHA tag is published for traceability.

After the first successful publication, open the package page under the GitHub account's **Packages** tab. If the image should be publicly pullable without authentication, set the GHCR package visibility to **Public** in its package settings. A public GitHub source repository does not, by itself, guarantee that a newly created GHCR package is public.

## Run an image locally

After the workflow has published an image:

```bash
docker pull ghcr.io/yyyuvvvraj/apivault:dev
```

The production container needs a reachable PostgreSQL database and runtime values for:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (use a high-entropy value of at least 32 characters)
- `BETTER_AUTH_URL` (the canonical URL users visit)

Pass these at runtime (for example with an untracked environment file); never bake them into the image or commit them to Git.

Example, assuming the environment file contains the three values above and the database URL points to a database reachable from Docker:

```bash
docker run --detach \
  --name apivault \
  --restart unless-stopped \
  --publish 3000:3000 \
  --env-file .env.production \
  ghcr.io/yyyuvvvraj/apivault:stable
```

The image intentionally contains only the standalone Next.js runtime and production files. Build-time database and auth values are non-secret placeholders and are not copied into the final runtime stage.

## Database migrations

Run committed Prisma migrations against the target database as a separate deployment step before switching application traffic to an image that requires the new schema. Use a trusted migration runner with the production `DATABASE_URL`; do not run `prisma migrate reset` in production.

## Actual hosting deployment

Publishing to GHCR makes a versioned container available; it does not select or configure a server. To automate the final deployment, choose a runtime target (for example, an EC2/VPS host, Azure Container Apps, Fly.io, or another container platform) and configure its deployment credentials as GitHub Actions secrets or use its supported OIDC integration. Keep database and Better Auth secrets in the runtime platform's secret manager.
