# Local development

## Requirements

- Node.js 24 LTS (see `.nvmrc`).
- npm 10 or newer.
- Docker Desktop or Docker Engine with Compose.
- Git.

## 1. Clone and configure

```bash
git clone https://github.com/yyyuvvvraj/APIVault.git
cd APIVault
git switch dev
cp .env.example .env
```

## 2. Start PostgreSQL

```bash
docker compose up -d
docker compose ps
```

Before starting PostgreSQL, set `POSTGRES_PASSWORD` in `.env` to a strong local-only password. Add the same password to the `DATABASE_URL` value, for example `postgresql://apivault:<your-password>@localhost:5432/apivault?schema=public`. These credentials are for local development only. Do not reuse them in production. Keep the `.env` file untracked.

## 3. Install dependencies and generate Prisma Client

```bash
npm install
npm run db:generate
```

## 4. Create the database schema

```bash
npm run db:migrate -- --name init
```

Commit the generated `prisma/migrations` directory with your schema changes. Do not edit an already-applied migration; create a new migration for follow-up changes.

## 5. Seed the initial category taxonomy

```bash
npm run db:seed
```

The seed script creates categories only. It intentionally does not insert unverified API listings.

## 6. Run the application

```bash
npm run dev
```

Open http://localhost:3000. The catalogue starts empty until verified API entries are added.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Database tools

```bash
npm run db:studio
```

To stop the local database:

```bash
docker compose down
```

To remove the local database volume permanently (destructive; deletes local data):

```bash
docker compose down -v
```

## Contribution flow

- Create a branch from `dev`.
- For code or schema changes, open a pull request into `dev`.
- For API data suggestions, use the GitHub **Suggest an API** issue template until the authenticated in-app moderation workflow is implemented.
- Include source URLs and evidence for catalogue facts.
