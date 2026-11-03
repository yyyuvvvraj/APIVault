# Container runtime contract

## Supported Node.js version

The application supports Node.js 24.x only. This is defined by:

- `.nvmrc`
- The `package.json` engine range (`>=24.0.0 <25`)
- The Node.js version used by Application CI

Every Docker stage that installs dependencies, builds Next.js, or runs the standalone server must use Node.js 24. Do not upgrade only the Docker base image to another major version; update the package engine, local setup guide, CI, architecture decision, and Docker build together after compatibility testing.

## PostgreSQL Compose healthcheck

The PostgreSQL healthcheck reads `POSTGRES_USER` and `POSTGRES_DB` from the container environment. It must not hard-code the default credentials because contributors can override these values in their local `.env` file.

The Compose healthcheck uses escaped dollar signs (`$$`) so variable expansion happens inside the container rather than on the host running Docker Compose.

## Validation

Before merging changes to the application Dockerfile or Compose database service:

1. Confirm all Node Docker stages use the supported Node major.
2. Run `docker compose config` with a local `.env` file.
3. Build the application image.
4. Start PostgreSQL with non-default local credentials and confirm the container becomes healthy.
5. Run the image smoke test and the application CI workflow.

Do not use production credentials or a production database for these checks.
