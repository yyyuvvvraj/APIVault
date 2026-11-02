# APIVault admin console setup

The admin console uses Better Auth with PostgreSQL through the Prisma adapter. It is deliberately closed to public registration: the sign-in screen does not offer account creation, and only users with the `admin` role can access `/admin`.

## 1. Install dependencies

After checking out the admin-console branch:

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
npx auth@latest generate
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
npx auth@latest create-admin --email you@example.com --name "APIVault Admin" --role admin
```

Follow the CLI prompts to set the password. Use a unique password of at least 12 characters. There is no public sign-up route.

## 5. Start the application

```bash
npm run dev
```

Visit [http://localhost:3000/admin/login](http://localhost:3000/admin/login), sign in with the provisioned admin account, and open the dashboard.

## Admin console scope

The first console release includes protected dashboard metrics, read-only API and category tables, and a submission inbox. API creation/editing, approval/rejection actions, and audit workflows are the next implementation slice; no moderation action is exposed until it is backed by a server-side authorization check and audit record.
