# APIVault setup guide (beginner-friendly)

This guide gets a fresh clone of APIVault running locally. Follow it in order; you do not need to install PostgreSQL directly because Docker Compose runs the database for you.

> **Supported setup:** Node.js 24 LTS, Go 1.25+, npm, Git, and Docker Desktop / Docker Engine with the Compose plugin. The commands below work on macOS, Windows (PowerShell or Git Bash), and Linux. On Windows, use WSL 2 for the smoothest Docker + Node development experience.

## 1. Install the prerequisites

Install these before cloning the project:

| Tool | Required version | Check |
| --- | --- | --- |
| Git | Current stable | `git --version` |
| Node.js | 24.x (the repository's `.nvmrc`) | `node --version` |
| npm | Bundled with Node 24; npm 10+ | `npm --version` |
| Go | 1.25 or newer (required) | `go version` |
| Docker | Docker Desktop / Engine with Compose v2 | `docker --version` and `docker compose version` |

**Important: use Node 24 and Go 1.25+.** The project declares Node `>=24 <25`. Node 20, 22, or 26 can cause engine warnings or inconsistent dependency/build behaviour.

### Switch to Node 24

If you use nvm:

```bash
nvm install 24
nvm use 24
node --version
```

The final command should print a `v24.x.x` version. If you do not use nvm, install Node.js 24 LTS from the official Node.js website and reopen your terminal.

Start Docker Desktop (macOS/Windows) or the Docker service (Linux) and wait until it is running.

## 2. Clone the repository

Open Terminal, PowerShell, or your IDE terminal:

```bash
git clone https://github.com/yyyuvvvraj/APIVault.git
cd APIVault
git switch dev
```

Check that you are on `dev`:

```bash
git branch --show-current
```

Do not start feature work directly on `dev`; create a short-lived branch after setup.

## 3. Create your local environment file

Copy the example file:

**macOS / Linux / Git Bash**
```bash
cp .env.example .env
```

**Windows PowerShell**
```powershell
Copy-Item .env.example .env
```

Open `.env` in VS Code. Set the following values. Use the same password in both the PostgreSQL password and the database URL:

```env
POSTGRES_USER=apivault
POSTGRES_PASSWORD=apivault_local_password
POSTGRES_DB=apivault

DATABASE_URL="postgresql://apivault:apivault_local_password@localhost:5432/apivault?schema=public"

BETTER_AUTH_SECRET="replace-this-with-a-generated-secret"
BETTER_AUTH_URL="http://localhost:3000"

VERIFIER_SHARED_SECRET=
APIVAULT_INTERNAL_URL="http://host.docker.internal:3000"
VERIFIER_SCAN_INTERVAL=30m
VERIFIER_CONCURRENCY=8

# Optional: protect the internal Prometheus metrics endpoint (minimum 32 random characters)
APIVAULT_METRICS_TOKEN=
```

Generate a Better Auth secret:

```bash
npx auth@latest secret
```

Copy the generated value into `BETTER_AUTH_SECRET`. If the command asks to install the Better Auth CLI, allow it. Alternatively, use a random secret of at least 32 characters.

Keep the local database password simple and URL-safe for this setup. If you choose a password containing characters such as `@`, `:`, `/`, or `#`, URL-encode it before placing it in `DATABASE_URL`.

**Never commit `.env` or share your auth secret.** The values above are for local development only and must never be reused in a hosted environment.

## 4. Start PostgreSQL

From the repository root:

```bash
docker compose up -d postgres
docker compose ps
```

Wait until the `apivault-postgres` container reports healthy:

```bash
docker compose logs -f postgres
```

Press Ctrl+C to stop following logs; this does not stop the database.

## 5. Install the project dependencies

Make sure Node 24 is active, then run:

```bash
npm ci
```

Use `npm ci` for a fresh clone. It installs the exact dependency versions from `package-lock.json`. Do not delete the lockfile or switch to another Node major to work around an installation error.

Generate Prisma Client:

```bash
npm run db:generate
```

## 6. Apply the database migrations and seed categories

The repository already contains the database migration history. For a fresh local database, run:

```bash
npm run db:deploy
npm run db:seed
```

- `db:deploy` applies the migrations committed to the repository.
- `db:seed` creates the starter category taxonomy.
- The seed does not create API listings or an administrator account.

**Do not run `prisma migrate reset` unless you intentionally want to delete your local database data.** Do not use `npm run db:migrate -- --name init` on a fresh clone; that command is for creating a new migration after you change the Prisma schema.

## 7. Provision a local administrator (optional)

Public registration is disabled. If you need to use the protected admin console locally, create your own local admin after the database is ready:

```bash
npx auth@latest create-admin --email you@example.com --name "APIVault Admin" --role admin --config ./src/lib/auth.ts
```

Follow the CLI prompts and use a local-only password of at least 12 characters. Do not use a real production password. See [ADMIN_SETUP.md](ADMIN_SETUP.md) for details.

## 8. Start APIVault

```bash
npm run dev
```

Open:

- Website: http://localhost:3000
- Admin login (after provisioning an admin): http://localhost:3000/admin/login

Keep this terminal running while you use the app. Stop the development server with Ctrl+C.

The catalogue may be empty on a new database. That is expected: the seed adds categories, not pre-approved API records. New catalogue entries must go through the verification/publication workflow before appearing in public results.

## 9. Useful development commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js development server |
| `npm run build` | Generate Prisma Client and create a production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm test` | Run unit tests |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:deploy` | Apply committed migrations |
| `npm run db:seed` | Seed starter categories |
| `npm run db:studio` | Open Prisma Studio |

PostgreSQL-backed integration tests use a disposable database. Only run them against a local test database, never production:

```bash
npm run test:integration
```

Go 1.25+ is a required project toolchain dependency even when working on the web application. Both Go services are part of normal validation. The verifier worker runs separately and can be started when needed. See [GO_VERIFIER.md](GO_VERIFIER.md) for configuration and worker-specific commands.

## 10. Common setup problems

### `npm ci` fails with an engine/version warning

Check:

```bash
node --version
npm --version
```

Use Node 24.x. If you changed Node versions after installing dependencies, remove the existing install and reinstall:

```bash
rm -rf node_modules
npm ci
```

On Windows PowerShell, use `Remove-Item -Recurse -Force node_modules` instead of `rm -rf`.

### Docker says it cannot connect to the daemon

Start Docker Desktop and wait for it to finish starting. Then check:

```bash
docker info
docker compose version
```

If `docker info` cannot connect, the database container cannot start yet.

### Port 5432 is already in use

Another local PostgreSQL server or container is using the port. Stop that service, or change the Compose port mapping from `5432:5432` to `5433:5432` in `docker-compose.yml` and change the host port in `DATABASE_URL` to `5433`. Do not change the container-side port.

### Prisma reports it cannot reach the database (for example P1001)

Check that PostgreSQL is healthy:

```bash
docker compose ps
docker compose logs postgres
```

Confirm the database is running and that `DATABASE_URL` uses `localhost:5432` (or your alternate host port) with the same username, password, and database configured in `.env`. Restart the service after changing environment values:

```bash
docker compose down
docker compose up -d postgres
```

### Prisma reports authentication failed (for example P1000)

The password in `DATABASE_URL` does not match the password used when the PostgreSQL volume was first initialized. If this is a brand-new disposable database and you do not need its data, reset the local volume:

```bash
docker compose down -v
docker compose up -d postgres
```

Then rerun `npm run db:deploy` and `npm run db:seed`.

**Warning:** `docker compose down -v` permanently deletes the local PostgreSQL data volume. Never use it if you need to preserve local data.

### `DATABASE_URL is required` or Prisma cannot load its config

Make sure the file is named exactly `.env` and is in the repository root beside `package.json` and `prisma.config.ts`. Check that `DATABASE_URL` is present and has no placeholder text.

### Migration command says there are no pending migrations

That is usually fine: it means the committed schema migrations are already applied. Continue with `npm run db:seed`.

### Port 3000 is already in use

Stop the other process using port 3000, or start Next.js on another port:

```bash
npm run dev -- --port 3001
```

If you use another port, update `BETTER_AUTH_URL` to match and restart the app.

### Admin login does not work

- Confirm you completed the administrator provisioning command.
- Confirm `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are set in `.env`.
- Restart `npm run dev` after editing `.env`.
- Check the terminal where Next.js is running for the actual error.
- Public sign-up is intentionally disabled; use the documented admin provisioning flow.

### The website opens but the API catalogue is empty

This is expected on a fresh database. The seed only creates categories. API records need to be added and pass the verification and publication requirements before public endpoints return them.

## 11. Reset or stop your local environment

Stop the database but preserve its data:

```bash
docker compose down
```

Start it again later:

```bash
docker compose up -d postgres
```

Delete the database volume and all local database data (destructive):

```bash
docker compose down -v
```

## 12. Before asking for help

If setup still fails, send the team:

1. Your operating system.
2. Output of `node --version`, `npm --version`, and `docker compose version`.
3. The exact command you ran.
4. The complete error message (remove passwords, tokens, and other secrets first).

Do not share your `.env` file, database password, Better Auth secret, session cookies, or real user credentials.
