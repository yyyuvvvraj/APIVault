# Hosted beta deployment (Render)

This guide provisions an isolated, temporary hosted environment for testing APIVault.
It is **not** the production deployment and must not contain production data.

## Resources

The root `render.yaml` Blueprint defines:

- `apivault-beta`: a Node.js web service in Render's Singapore region, tracking `dev`
- `apivault-beta-db`: a separate PostgreSQL 18 database in Singapore
- A Render-generated `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` sourced from the service's Render-provided external URL
- A readiness check at `/api/health/ready`

The web service runs committed Prisma migrations before starting the application.
The database URL and auth secret are managed by Render and are not committed to Git.

## Provision the beta

1. Merge the deployment Blueprint PR into `dev) after its checks pass.
2. Sign in to Render and choose **New → Blueprint**.
3. Connect the GitHub repository `yyyuvvvraj/APIVault` and select the `dev` branch.
4. Review the Blueprint resources. Confirm that both resources use the **Free** plan and the **Singapore** region.
5. Apply the Blueprint. Do not upgrade either resource or add a paid add-on.
6. Wait for the first deployment to finish. The first database migration runs as part of the service start command.
7. Open the generated `onrender.com` service URL and verify:
   - The home page responds over HTTPS.
   - `/api/health/ready` returns HTTP 200 and reports the database as ready.
   - `/api/v1/categories` and `/api/v1/apis` return valid API responses.
8. Keep the beta URL private to the intended testers until the release candidate is approved.

## Free-tier limitations and data handling

- Render's free PostgreSQL database expires after 30 days. Treat it as disposable beta data; export anything you need before expiry.
- Free web services can spin down when idle, so the first request after inactivity may take longer.
- The free database is not a production backup strategy. Do not store production data, real credentials, or information that must be retained.
- This configuration intentionally provisions no paid resources. If you need a longer-lived beta, pause and review the current Render pricing before selecting a paid database or service plan.
- The service follows `dev`, so every commit merged into `dev` can update the hosted beta. Do not merge unreviewed changes while testers are using it.

## Admin access

Public account registration is disabled in APIVault. Do not enable open signups for the beta.
Create a dedicated beta administrator only after the hosted deployment is healthy, using the repository's documented admin-provisioning procedure. Use a unique password and do not reuse personal or production credentials.

## Teardown

When testing is complete, delete the `apivault-beta` web service and `apivault-beta-db` database from Render. Export any beta feedback or data you want to retain first.
