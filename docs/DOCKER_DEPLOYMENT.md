# Docker build and deployment

## Branch and release strategy

APIVault uses separate development and release paths:

- Pull requests targeting `dev` or `stable`: build a native amd64 image and run a container smoke test. The image is not published.
- Pushes to `dev`: build and publish an amd64 image tagged `dev` (and its commit SHA). This is the frequently updated integration image used for testing.
- Pushes to `stable`: do not publish a Docker image. This branch contains reviewed, production-ready source code.
- Version tags matching `v0.*` or `v1.*`: only when the tagged commit is already reachable from `stable`, build and publish a multi-platform (amd64 and arm64) release image. Generate provenance and SBOM attestations for this release image.

For example, a final release is created by tagging a commit already merged into `stable` as `v0.0.1` for the first stable release. Subsequent releases can follow SemVer, for example `v0.0.2` and later `v1.0.0`. The `latest` container tag is updated only by a successful version-tag release (`v0.x` or `v1.x`).

The workflow uses the repository-provided `GITHUB_TOKEN`; no Docker Hub account or long-lived registry password is required. BuildKit's GitHub Actions cache is enabled.

## Image names

For this repository, the image is:

```text
ghcr.io/yyyuvvvraj/apivault:dev
ghcr.io/yyyuvvvraj/apivault:v0.0.1
ghcr.io/yyyuvvvraj/apivault:latest
ghcr.io/yyyuvvvraj/apivault:sha-<commit>
```

The `dev` tag is mutable and follows the latest successful dev publish. Version tags are immutable release references by convention. The `latest` tag tracks the latest published v1.x release. A public GitHub source repository does not, by itself, guarantee that a newly created GHCR package is public; set package visibility to **Public** only when anonymous pulls are desired.

## Run an image locally

For the latest development build:

```bash
docker pull ghcr.io/yyyuvvvraj/apivault:dev
```

For a specific versioned release:

```bash
docker pull ghcr.io/yyyuvvvraj/apivault:v0.0.1
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
  ghcr.io/yyyuvvvraj/apivault:v1.0.0
```

The image intentionally contains only the standalone Next.js runtime and production files. Build-time database and auth values are non-secret placeholders and are not copied into the final runtime stage.

## Database migrations

Run committed Prisma migrations against the target database as a separate deployment step before switching application traffic to an image that requires the new schema. Use a trusted migration runner with the production `DATABASE_URL`; do not run `prisma migrate reset` in production.

## Actual hosting deployment

Publishing to GHCR makes a versioned container available; it does not select or configure a server. The intended production deployment should be triggered only after a successful version-tag release image publication. Keep database and Better Auth secrets in the runtime platform's secret manager.
