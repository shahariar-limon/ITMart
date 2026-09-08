# Deployment and Operations Runbook

## Release prerequisites

- A green `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` run.
- A Neon (PostgreSQL) project with a least-privilege application user; `DATABASE_URL` must support transactions (see `backend/.env.example`).
- PostgreSQL schema applied with `npx prisma migrate deploy`.
- Backend environment values from `backend/.env.example`; secrets belong in the hosting provider, never source control.
- Frontend `VITE_API_URL` set to the public API `/api/v1` URL.

## Deploy

1. Deploy the API using `render.yaml` or equivalent. Set `DATABASE_URL`, a random 32+ character `JWT_SECRET`, and the exact frontend `CORS_ORIGIN`.
2. Deploy `frontend/` to Vercel. The included rewrite supports React Router deep links.
3. Keep `PAYMENT_PROVIDER=cod` unless the simulated demonstration path is required.
5. Confirm `/api/v1/health`, registration/login, public catalog, and one role-specific flow.

## Rollback

Redeploy the last known-good immutable revision. This release has no destructive migration; newly added fields have defaults. Never restore application files by deleting the database.

## Backup and recovery

- Enable Neon point-in-time restore or scheduled snapshots with retention appropriate to the environment.
- Test restore into an isolated database before production use.
- Record recovery owner, last restore-test date, target RPO, and target RTO in the deployment environment's operations log.

## Incident checks

1. Check health endpoint and host status.
2. Correlate sanitized server logs using `x-request-id`.
3. Check Neon/PostgreSQL availability, connection limits, and transaction support.
4. Check exact CORS origin and environment configuration.
5. Roll back if a release introduced the failure; preserve logs and affected request IDs.

No real card data is accepted. The `simulated` payment method generates only a synthetic authorization reference.
