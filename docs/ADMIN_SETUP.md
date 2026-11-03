# APIVault admin console setup

The admin console uses Better Auth with PostgreSQL through the Prisma adapter. Public registration is disabled. Only users with the `admin` role can access the protected `/admin` console and its server actions.

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

Do not commit `.env` or share the secret. Use a separate high-entropy secret and canonical URL for any future hosted environment.

## 3. Generate the authentication schema

The Better Auth Prisma adapter uses the existing Prisma 7 client and PostgreSQL database. The committed Prisma schema includes the `User`, `Session`, `Account`, and `Verification` models and admin plugin fields.

If you intentionally change the Better Auth schema, follow the generator workflow below, review the schema diff, and commit a new migration:

```bash
npm run db:generate
npx auth@latest generate --adapter prisma --dialect postgresql --config ./src/lib/auth.ts
npm run db:generate
npm run db:migrate -- --name describe_auth_change
```

Never run `prisma migrate reset` against a database containing data you want to keep.

## 4. Create the first administrator

The Better Auth CLI can provision the first admin account:

```bash
npx auth@latest create-admin --email you@example.com --name "APIVault Admin" --role admin --config ./src/lib/auth.ts
```

Follow the CLI prompts to set a unique password of at least 12 characters. There is no public sign-up route. Do not put real administrator credentials in source control, issues, pull requests, screenshots, or logs.

## 5. Start the application

```bash
npm run dev
```

Visit [http://localhost:3000/admin/login](http://localhost:3000/admin/login), sign in with the provisioned administrator account, and open the dashboard.

## Admin capabilities

The protected console currently provides:

- Dashboard metrics backed by catalogue data.
- API catalogue administration: create and edit API records.
- API lifecycle review: explicitly manage availability and verification status, with evidence checks before verification and publication.
- Category management: create, edit, and safely delete categories that are not in use.
- Community submission moderation: move submissions through allowed review states, request changes, reject, and approve submissions in review.
- Submission application: apply approved CREATE and UPDATE payloads to canonical catalogue records transactionally.
- API revision history: inspect immutable JSON snapshots and revision metadata.

## Publication and moderation rules

- Creating an API does not publish it. New records start as `ACTIVE + PENDING_REVIEW` and have no `publishedAt` value.
- Public catalogue queries include only records that are both `ACTIVE` and `VERIFIED`.
- Verification requires an official homepage evidence row matching the API's canonical homepage, at least one category, and at least one authentication classification.
- Changing an API's availability or verification state is an explicit admin action. Records are hidden whenever either publication condition is not met.
- Submission review actions enforce allowed state transitions on the server. A request for changes or rejection requires a meaningful reviewer note.
- Approval is available only for submissions in `IN_REVIEW`. The stored payload is validated again at approval time.
- Applying a submission, writing its API revision snapshot, and marking the submission approved happen in one database transaction.
- Newly created or materially updated APIs remain pending verification after a community submission is applied.
- Ordinary API edits do not silently change verification status.
- API edits, lifecycle changes, and submission application write revision snapshots where applicable.

Every server action must enforce authorization itself; hiding a button or route in the UI is not a security boundary. Follow [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) when reviewing catalogue evidence.
