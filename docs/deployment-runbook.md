# Deployment and Operations Runbook

## Release prerequisites

- A green `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` run.
- MongoDB Atlas replica set with a least-privilege application user and network rules.
- Backend environment values from `backend/.env.example`; secrets belong in the hosting provider, never source control.
- Frontend `VITE_API_URL` set to the public API `/api/v1` URL.

## Deploy

1. Deploy the API using `render.yaml` or equivalent. Set `MONGODB_URI`, a random 32+ character `JWT_SECRET`, and the exact frontend `CORS_ORIGIN`.
2. Deploy `frontend/` to Vercel. The included rewrite supports React Router deep links.
3. Keep `PAYMENT_PROVIDER=cod` unless the simulated demonstration path is required.
4. Leave `AI_API_URL` and `AI_API_KEY` empty to use deterministic search. If configured, the endpoint must accept `{ query }` and return `{ terms }` within three seconds.
5. Confirm `/api/v1/health`, registration/login, public catalog, and one role-specific flow.

## Rollback

Redeploy the last known-good immutable revision. This release has no destructive migration; newly added fields have defaults. Never restore application files by deleting the database.

## Backup and recovery

- Enable Atlas continuous backup or daily snapshots with retention appropriate to the environment.
- Test restore into an isolated database before production use.
- Record recovery owner, last restore-test date, target RPO, and target RTO in the deployment environment's operations log.

## Incident checks

1. Check health endpoint and host status.
2. Correlate sanitized server logs using `x-request-id`.
3. Check Atlas availability, connection limits, and transaction support.
4. Check exact CORS origin and environment configuration.
5. Roll back if a release introduced the failure; preserve logs and affected request IDs.

No real card data is accepted. The `simulated` payment method generates only a synthetic authorization reference.

