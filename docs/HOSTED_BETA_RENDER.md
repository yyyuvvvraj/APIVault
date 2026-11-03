# Hosted beta deployment (Render + Neon)

This guide provisions an isolated hosted environment for testing APIVault.
It is **not** the production deployment and must not contain production data.

## Resources

- `apivault-beta`: Render Node.js web service, Singapore region, Free plan, tracking `dev`
- Neon PostgreSQL: external database on Neon's Free plan, preferably AWS Singapore
- A Render-generated `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` sourced from Render's external service URL
- Readiness check at `/api/health/ready`

The application uses `DATABASE_URL` for runtime PostgreSQL connections.
Prisma CLI migrations use `DIRECT_URL` when present, so use Neon's pooled URL for
`DATABASE_URL` and its direct (non-pooled) URL for `DIRECT_URL`.

The Render PostgreSQL resource in the Blueprint is a temporary migration fallback.
It is deliberately not wired into the application. Keep it until Neon is verified,
then remove it in a separate cleanup change.

## Create the Neon database

1. Create a project at [Neon](https://neon.com/) using the Free plan.
2. Choose the AWS Singapore region if available, to keep it close to the Render service.
3. Create/select the default database and role.
4. In the Neon Console, open **Connect** and copy both connection strings:
   - **Pooled** URL (hostname contains `-pooler`) → Render `DATABASE_URL`
   - **Direct** URL (hostname does not contain `-pooler`) → Render `DIRECT_URL`
5. Keep both URLs private. They contain database credentials; never commit them or paste them into public issues or pull requests.

## Configure Render

1. Open the `apivault-beta` service in the Render Dashboard.
2. Go to **Environment**.
3. Set `DATABASE_URL` to the Neon pooled connection string.
4. Set `DIRECT_URL` to the Neon direct connection string.
5. Save changes and allow Render to redeploy.
6. The start command runs committed Prisma migrations using `DIRECT_URL` before starting the app.

## Verify the hosted beta

Open the generated `onrender.com` service URL and verify:

- The home page responds over HTTPS.
- `/api/health/ready` returns HTTP 200 and reports the database as ready.
- `/api/v1/categories` and `/api/v1/apis` return valid API responses.
- Render logs show successful Prisma migrations and no database connection errors.

Keep the beta URL private to the intended testers until the release candidate is approved.
Do not migrate production data into this beta database.

## Free-tier limits and data handling

- Neon Free currently includes 1 GB PostgreSQL storage per project, 100 compute-hours per project per month, and 5 GB public network transfer per project per month. Compute scales to zero after inactivity; exhausting compute or transfer allowances can suspend compute until the monthly reset.
- Render Free web services can spin down when idle, so the first request after inactivity may take longer.
- The temporary Render PostgreSQL database expires after 30 days. Do not rely on it for retained data.
- This configuration intentionally provisions no paid resources. Do not approve paid upgrades or add-ons without explicit review.
- The service follows `dev`, so every commit merged into `dev` can update the hosted beta. Do not merge unreviewed changes while testers are using it.

## Admin access

Public account registration is disabled in APIVault. Do not enable open signups for the beta.
Create a dedicated beta administrator only after the hosted deployment is healthy, using the
repository's documented admin-provisioning procedure. Use a unique password and do not reuse
personal or production credentials.

## Cleanup after Neon verification

After the application has been healthy against Neon and any required beta data is retained,
remove the temporary `apivault-beta-db` Render resource from the Blueprint and delete that
Render database from the Dashboard. Do not delete it before the Neon connection and migrations
have been verified.

## Teardown

When testing is complete, delete the `apivault-beta` web service and any remaining beta
database resources. Export any beta feedback or data you want to retain first.
