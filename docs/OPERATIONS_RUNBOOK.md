# APIVault operations runbook

This runbook describes operational controls expected for a hosted v0.1 deployment. It does not claim that a backup, restore, alert destination, or provider configuration is active until an operator records evidence.

## Database backups

1. Prefer the database provider's automated, point-in-time recovery feature for the primary production database. Confirm the retention window, region, encryption, access controls, and restore procedure in the provider console.
2. For an independent encrypted export, install PostgreSQL client tools and [age](https://age-encryption.org/). Supply connection details through environment variables or a secret manager; use a PostgreSQL passfile with mode 0600 for the password. Never place passwords in shell arguments or commit them.
3. Create an age recipient and keep the matching identity offline or in an approved secret manager.
4. Run `scripts/backup-postgres.sh` with `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`, `PGPASSFILE`, `PGSSLMODE=require`, and `BACKUP_ENCRYPTION_RECIPIENT`. Optional settings: `BACKUP_DIR` and `BACKUP_RETENTION_DAYS`.
5. Store encrypted backup files in access-controlled off-host storage. The script's local directory is only a staging location; it is not an off-site backup.
6. Record backup timestamp, database branch, file checksum, storage location, and operator. Do not record credentials.

## Restore drill

1. Provision an isolated, empty PostgreSQL database in a non-production project/branch.
2. Supply the encrypted backup path, age identity file, and isolated target connection details.
3. Set `RESTORE_TARGET=isolated` explicitly. The restore script refuses to run without this guard.
4. Run `scripts/restore-postgres.sh`. Validate migration state, representative catalogue counts, user/key ownership, and application readiness against the isolated target.
5. Record elapsed restore time, backup age, row-count checks, failures, and the operator. Delete the isolated restored database and temporary files according to the data-handling policy.
6. Repeat after schema changes and at least quarterly. A backup is not considered validated until a restore drill succeeds.


## Catalogue import failure recovery

- Inspect the failed `CatalogueImportRun` and its `CatalogueImportBatch` rows. A failed batch retains its batch number, record count, zero committed records, and error summary even though the batch transaction was rolled back.
- Correct the underlying operational cause (for example, seed a required category or restore database connectivity) without changing the manifest or its provenance.
- Retry with the exact same input file, run ID, and batch size. The importer verifies the input fingerprint, skips completed batches, and resets the failed batch checkpoint before retrying it.
- Confirm the run reaches `COMPLETED`, the failed batch becomes `COMPLETED`, and its error summary is cleared. Do not assign a new run ID to bypass a failed checkpoint or alter the input while reusing an existing run ID.
- If the diagnostic row could not be persisted because PostgreSQL was unavailable, use the run-level error summary and application logs; restore database connectivity before retrying.

## Uptime, readiness, and alerting

- `GET /api/health/ready` checks application-to-database readiness. A 200 means the check passed at that instant; it is not an uptime guarantee.
- `GET /api/ops/metrics` exposes process-local Prometheus metrics and requires `APIVAULT_METRICS_TOKEN`. Process-local metrics reset on restart and are not a substitute for centralized collection.
- Configure the repository variable `APIVAULT_BASE_URL` with the hosted origin to enable the scheduled/manual GitHub Actions smoke check in `.github/workflows/uptime-check.yml`.
- GitHub Actions failures are a supplementary signal only. Configure an external uptime monitor, centralized logs/metrics retention, and a paging/alert destination with a named owner before public production use.
- Test alert delivery by deliberately using a non-production endpoint or test alert. Do not induce failure on production to test notifications.

## Security headers and ingress

- Production responses include HSTS. Confirm TLS is enforced at the public ingress before relying on it.
- CSP is currently report-only; review browser reports and legitimate third-party integrations before enforcement. Do not switch to an enforcing policy without testing the sign-in, account, admin, and docs flows.
- Confirm the hosting proxy sets trusted client IP headers. The current rate limiter reads `x-real-ip` first and then the first `x-forwarded-for` value; do not trust client-supplied forwarding headers at an ingress that does not overwrite them.
- Rotate `BETTER_AUTH_SECRET`, `APIVAULT_METRICS_TOKEN`, verifier credentials, database credentials, and API keys according to the secret owner's policy. Never log raw credentials.

## Incident response

1. Confirm impact using readiness, provider status, centralized logs, and recent deploy history.
2. Assign an incident owner and record the start time, affected routes, customer impact, and mitigation.
3. For database connectivity failures, verify provider status, TLS, pooler capacity, credentials, and recent migrations. Avoid destructive schema changes during diagnosis.
4. For elevated abuse, preserve the anonymous IP limit, revoke compromised API keys, and use ingress-level controls. Do not silently raise limits.
5. Roll back only to a known-good image/schema-compatible version. Prefer a forward migration for irreversible schema changes.
6. After recovery, record root cause, timeline, corrective actions, and follow-up owners.

## Release operations evidence

Before v0.1.0 is promoted to `stable`, attach evidence for an isolated restore drill, external monitor/alert delivery, trusted proxy configuration, CSP review, and a hosted smoke check on the exact candidate.


## Scheduled encrypted backup workflow

The repository includes `.github/workflows/database-backup.yml`, which runs manually or daily at 02:15 UTC. Configure these repository Actions secrets first:

- `APIVAULT_BACKUP_PGHOST`
- `APIVAULT_BACKUP_PGPORT` (optional; defaults to 5432)
- `APIVAULT_BACKUP_PGUSER`
- `APIVAULT_BACKUP_PGDATABASE`
- `APIVAULT_BACKUP_PGPASSFILE` (one PostgreSQL passfile line: `host:port:database:username:password`)
- `APIVAULT_BACKUP_AGE_RECIPIENT` (public age recipient; keep the matching private identity outside Actions)

The workflow uses PostgreSQL 18 client tools, requires TLS, encrypts the dump with age, and uploads only the encrypted file as a short-lived GitHub Actions artifact. The artifact is retained for 14 days and is staging/transport only, not durable off-site storage or a substitute for provider-native backups. Export encrypted artifacts to approved durable storage and perform an isolated restore drill before claiming the backup gate complete. Never upload the age identity or an unencrypted dump.

## Reproducible catalogue release count

Run `npm run catalogue:report` with a read-only database connection to produce JSON evidence with timestamp, eligible count, exclusions, and category/provider breakdown. The report mechanically requires ACTIVE + VERIFIED + published records, provider, category, and official HTTPS source evidence, and deduplicates normalized provider/name pairs. Human review must still exclude mirrors, aliases, endpoint-only records, versions, and records whose provider terms do not permit inclusion.

The manual `.github/workflows/catalogue-release-report.yml` workflow produces a 90-day evidence artifact. Configure `APIVAULT_REPORT_DATABASE_URL` as a read-only repository secret. Set `enforce_1000` to true when evaluating a release candidate; the workflow then fails if fewer than 1,000 eligible records are present.


## External uptime alert webhook

The hosted uptime workflow can notify an operator-controlled webhook after a failed smoke check. Configure the repository Actions secret `APIVAULT_ALERT_WEBHOOK_URL`; optionally configure `APIVAULT_ALERT_WEBHOOK_TOKEN` for bearer authentication. The receiver must accept a JSON POST containing `text`, `status`, `repository`, `workflow`, `run_url`, and `base_url`.

Run the workflow manually with `send_test_alert=true` to test delivery without intentionally breaking the hosted service. A successful HTTP response proves only that the receiver accepted the request; record that the named operator actually received and acknowledged the notification. If the webhook secret is absent, the notification job warns and skips sending.


## Durable off-site backup with AWS S3

The scheduled backup workflow supports an optional, keyless AWS upload using GitHub Actions OIDC. Configure these repository **variables** (not long-lived access-key secrets):

- `APIVAULT_BACKUP_AWS_ROLE_ARN`: IAM role trusted for this repository's GitHub Actions OIDC identity.
- `APIVAULT_BACKUP_AWS_REGION`: AWS region containing the backup bucket.
- `APIVAULT_BACKUP_S3_BUCKET`: private S3 bucket dedicated to APIVault backups.

Restrict the IAM role trust policy to the repository and the `dev` branch subject (`repo:yyyuvvvraj/APIVault:ref:refs/heads/dev`) unless a separately reviewed deployment environment is used. Grant only `s3:PutObject` and `s3:GetObject` for the required `apivault/postgres/*` prefix, plus the minimum multipart-upload permissions needed by the AWS CLI. Do not grant bucket administration or public-access changes to the workflow role.

Before enabling uploads, configure the bucket with Block Public Access, bucket-owner-enforced object ownership, versioning where appropriate, default encryption, and a lifecycle/retention policy approved by the data owner. The workflow encrypts dumps with age before upload and requests S3 server-side encryption as an additional layer. Keep the age private identity outside GitHub Actions and outside the bucket.

After configuration, run the workflow manually and verify the S3 object, checksum metadata, access controls, retention, and restore procedure. A successful upload is still not a completed restore drill. If the variables are absent, the workflow explicitly reports that the run produced only a short-lived Actions artifact and does not satisfy durable off-site backup readiness.


## Automated isolated restore drill

The manual workflow `.github/workflows/restore-drill.yml` downloads an age-encrypted backup from the configured private S3 bucket, restores it only when the operator explicitly confirms an isolated target, and validates that the restored database contains successful Prisma migration history. It does not run on a schedule and never chooses a target automatically.

Configure these repository secrets:

- `APIVAULT_RESTORE_PGHOST`
- `APIVAULT_RESTORE_ALLOWED_HOST` (repository variable; must exactly match the restore host secret)
- `APIVAULT_RESTORE_ALLOWED_DATABASE` (repository variable; must exactly match the disposable restore database secret)
- `APIVAULT_RESTORE_PGPORT` (optional; defaults to 5432)
- `APIVAULT_RESTORE_PGUSER`
- `APIVAULT_RESTORE_PGDATABASE` (must identify a disposable non-production database)
- `APIVAULT_RESTORE_PGPASSFILE` (one PostgreSQL passfile line)
- `APIVAULT_RESTORE_AGE_IDENTITY` (private age identity; never commit or upload it)

The workflow also requires the S3/OIDC repository variables documented above and an IAM role with narrowly scoped `s3:GetObject` access to the backup prefix. The same role needs `s3:PutObject` for scheduled backups; a separate read-only restore role is preferable if the owner configures it. Before any AWS access, the workflow fails closed unless the secret host and database exactly match the two explicit allowlist variables. The database name is additionally rejected if it contains a production marker. Set the allowlist variables only after independently verifying the disposable target in the database provider; do not copy production connection details.

Run manually with `confirm_isolated_target=true` and an exact encrypted object key. The workflow refuses production-like database names and any key outside `apivault/postgres/*.dump.age`. Review the run summary and evidence artifact, then validate representative row counts, application readiness, and account/key ownership manually. The workflow deliberately does not drop the target database; the operator must inspect and clean it up. A successful migration-history check alone is not a complete recovery acceptance record.
