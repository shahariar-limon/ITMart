# ITMart

ITMart is a unified IT product commerce and technical-service delivery platform. The approved product and engineering baseline is in [Plan.md](./Plan.md).

## Prerequisites

- Node.js 22 LTS or 24
- npm 10+
- MongoDB 7+ locally, or a MongoDB Atlas connection string

MongoDB must run as a replica set before the transactional checkout phase is implemented.

## Setup

1. Run `npm install` from the repository root.
2. Copy `backend/.env.example` to `backend/.env` and set a strong JWT secret.
3. Copy `frontend/.env.example` to `frontend/.env` if the default API URL is unsuitable.
4. Start both applications with `npm run dev`.

The web application defaults to `http://localhost:5173`; the API defaults to `http://localhost:4000`. Health is available at `GET /api/v1/health`.

## Commands

- `npm run dev` — run API and web applications.
- `npm run build` — create production builds.
- `npm run typecheck` — verify strict TypeScript.
- `npm test` — run all automated tests.
- `npm run lint` — run ESLint.
- `npm run format:check` — verify formatting.

## Implemented scope

- Phase 0: repository foundation, API/web shells, validation/error conventions, CI, and test harnesses.
- Phase 1: Customer registration, login, current-user endpoint, JWT middleware, role middleware, authentication UI, and protected routes.
- Phase 2: Category and product administration, archive semantics, indexed product discovery, pagination, storefront listing, and product detail.
- Phase 3: Persistent cart, transactional checkout, immutable order snapshots, inventory protection/restoration, order state machine, customer order tracking, and Admin order management.
- Phase 4: Technical-service catalog, customer booking requests, Admin confirmation/assignment/scheduling, concurrency-safe overlap prevention, technician-scoped work progression, cancellation, and role-specific interfaces.
- Phase 5: Admin operational dashboard and visual summaries.
- Phase 6: Reviews, wishlist, comparison, bundles, notifications, reports, and CSV export.
- Phase 7: Solution quotations, business pricing, optional AI fallback, and payment-provider abstraction.
- Phase 8: Automated release gates, deployment manifests, test matrix, and operations runbook.

## Security notes

Public registration always creates a Customer. Technician and Admin accounts must be provisioned through trusted administrative tooling in a later phase. Access tokens are held in browser memory for this academic MVP; refreshing the page requires login again. A production release should use short-lived access tokens with an HttpOnly refresh-token cookie and CSRF controls.
