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
