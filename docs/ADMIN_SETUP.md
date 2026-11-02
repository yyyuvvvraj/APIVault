# APIVault admin console setup

The admin console uses Better Auth with PostgreSQL through the Prisma adapter. It is deliberately closed to public registration: the sign-in screen does not offer account creation, and only users with the `admin` role can access `/admin`.

## 1. Install dependencies

After checking out the current `dev` branch:

```bash
npm install
```

## 2. Configure Better Auth

Add these values to your local, gitignored `.env` file:

```env
BETTER_AUTH_SECRET="replace-with-a-random-secret-of-at-least-32-characters"
BETTER_AUTH_URL="http://localhost:3000"
```

Generate a secret with:

```bash
npx auth@latest secret
```

Do not commit `.env` or share the secret. For production, set a different secret and the deployed canonical URL in the hosting provider's environment settings.

## 3. Generate the authentication schema

The Better Auth Prisma adapter uses the existing Prisma 7 client and PostgreSQL database. Generate the required `User`, `Session`, `Account`, and `Verification` models, including the admin plugin fields:

```bash
# Generate the current application client so the auth config can load
npm run db:generate

# Generate Better Auth's User, Session, Account, and Verification models
npx auth@latest generate --adapter prisma --dialect postgresql --config ./src/lib/auth.ts

# Regenerate the client with the authentication models included
npm run db:generate
```

Review the generated changes to `prisma/schema.prisma`, then create and apply a migration:

```bash
npm run db:migrate -- --name add_authentication
```

Commit the updated schema and the generated `prisma/migrations` directory in a PR to `dev`. Never run `prisma migrate reset` against a database containing data you want to keep.

## 4. Create the first administrator

The Better Auth CLI can provision the first admin account:

```bash
npx auth@latest create-admin --email you@example.com --name "APIVault Admin" --role admin --config ./src/lib/auth.ts
```

Follow the CLI prompts to set the password. Use a unique password of at least 12 characters. There is no public sign-up route.

## 5. Start the application

```bash
npm run dev
```

Visit [http://localhost:3000/admin/login](http://localhost:3000/admin/login), sign in with the provisioned admin account, and open the dashboard.

## Admin console scope

The console currently includes:

- Protected dashboard metrics.
- A read-only API catalogue with an admin-only **Add API** workflow.
- Read-only category management.
- A read-only community submission inbox.

New APIs created in the admin console are saved as `PENDING_REVIEW`, receive homepage/documentation source records, and get a `CREATED` revision snapshot in the same database transaction. They are deliberately excluded from public catalogue queries until a maintainer verifies them.

API editing, controlled verification/publishing, category CRUD, and submission approval/rejection remain separate implementation tasks. Do not mark an API verified merely to make it appear publicly; follow the review steps in [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md).
