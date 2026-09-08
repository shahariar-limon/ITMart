# ITMart

**A unified IT commerce and technical-service delivery platform.**

ITMart connects product shopping, inventory, service bookings, and technician assignments in one role-based application. Customers purchase IT products and book services, administrators manage operations, and technicians track their assigned work.

## Live deployment

| Resource      | Link                                                                                   |
| ------------- | -------------------------------------------------------------------------------------- |
| Live frontend | [https://itmart-api.onrender.com](https://itmart-api.onrender.com)                     |
| Live backend  | [https://itmart.onrender.com](https://itmart.onrender.com)                             |
| API base URL  | [https://itmart.onrender.com/api/v1](https://itmart.onrender.com/api/v1)               |
| Health check  | [https://itmart.onrender.com/api/v1/health](https://itmart.onrender.com/api/v1/health) |

Despite its name, `itmart-api.onrender.com` hosts the frontend. The Express backend is at `itmart.onrender.com`. Use the [hosted login page](https://itmart-api.onrender.com/login), or locally visit `http://localhost:5173/login`.

## Demo login credentials

The [seed script](backend/src/seed.ts) provisions these demonstration accounts:

| Role       | Email                    | Password     | Access                                                |
| ---------- | ------------------------ | ------------ | ----------------------------------------------------- |
| Customer   | `customer@itmart.test`   | `Demo@12345` | Shopping, checkout, own orders, and bookings          |
| Technician | `technician@itmart.test` | `Demo@12345` | Assigned service jobs and work progression            |
| Admin      | `admin@itmart.test`      | `Demo@12345` | Catalog, orders, bookings, assignments, and dashboard |

Run `npm run db:seed -w backend` after applying migrations to create these accounts locally. Live access depends on whether the deployed database has been seeded; these credentials have not been verified against the live deployment.

These are public demo credentials for demonstration environments. Rerunning the seed resets these accounts' passwords and updates sample catalog data. Replace or disable demo accounts before using an environment with real customer data.

## bKash sandbox test payment

On the bKash sandbox checkout page, use these public test-wallet details:

| Field                   | Test value    |
| ----------------------- | ------------- |
| bKash account number    | `01770618575` |
| OTP / verification code | `123456`      |
| PIN                     | `12121`       |

Enter the wallet number, confirm, then enter the OTP and PIN when prompted. These values come from the [official bKash tokenized sandbox demo](https://merchantdemo.sandbox.bka.sh/tokenized-checkout/version/v1.2.0-beta). They are for sandbox payments only. The server's `BKASH_USERNAME` and `BKASH_PASSWORD` are API credentials, not wallet login details.

If the wallet is reported as ineligible, verify the number and that the checkout is using the sandbox environment. If it still fails, check the official demo or the test wallets supplied with your merchant sandbox account.

### Payment amounts

ITMart stores prices and order totals as integer **paisa** (100 paisa = 1 BDT). The bKash integration converts them to decimal **taka** when creating a payment and converts the verified provider amount back to paisa before comparing it with the order.

For a BDT 2,850 subtotal:

| Delivery | Fee (BDT) | bKash total (BDT) |
| -------- | --------- | ----------------- |
| Pickup   | 0         | 2,850.00          |
| Standard | 80        | 2,930.00          |
| Express  | 180       | 3,030.00          |

After deploying an amount-conversion fix, cancel an old unpaid checkout and create a fresh order. Previously generated bKash checkout URLs retain their original amounts; existing order snapshots are not rewritten.

### Redirect or insufficient-balance troubleshooting

On the backend Render service (`itmart.onrender.com`), configure:

```dotenv
BKASH_CALLBACK_URL=https://itmart.onrender.com/api/v1/payments/bkash/callback
CORS_ORIGIN=https://itmart-api.onrender.com
```

Save and redeploy the backend. The callback must reach Express before redirecting to the frontend's `/payment-result` page. Pointing it at `itmart-api.onrender.com/api/v1/...` reaches the frontend and returns 404.

If bKash reports insufficient balance, verify its displayed amount and start a fresh checkout after deploying the amount fix. Reusing an old payment URL keeps the old inflated amount. If the amount is correct and the official test wallet still fails, use another test wallet supplied for your merchant account or contact bKash about its sandbox balance. The application cannot top up a bKash test wallet or turn a failed payment into a successful one. Cash on delivery remains available for the demonstration.

## Features

- **Authentication:** customer registration, JWT login, and server-enforced Customer, Technician, and Admin permissions.
- **Commerce:** categories, searchable product listings, filters, pagination, product details, persistent cart, checkout, and order tracking.
- **Inventory:** transactional checkout, server-calculated pricing, immutable order snapshots, and stock restoration on eligible cancellation.
- **Service delivery:** service catalog, booking requests, technician assignment, scheduling conflict prevention, and status tracking.
- **Administration:** catalog and service management, order processing, booking coordination, and operational dashboard metrics.
- **Additional modules:** reviews, wishlist, comparison, bundles, notifications, reports and CSV exports, quotations, business pricing, and customer support.
- **Payments:** cash on delivery, simulated payments, and configurable bKash integration with a sandbox endpoint by default.

[Plan.md](Plan.md) defines the approved scope, architecture, and acceptance criteria. Module availability does not imply that every release acceptance gate has passed.

## Technology stack

| Layer                   | Technologies                                            |
| ----------------------- | ------------------------------------------------------- |
| Frontend                | React 19, Vite 7, React Router 7, Axios, Tailwind CSS 4 |
| Backend                 | Node.js, Express 5, strict TypeScript                   |
| Database                | PostgreSQL / Neon, Prisma ORM                           |
| Validation and security | Zod, JWT, bcryptjs, Helmet, CORS, rate limiting         |
| Testing                 | Vitest, Supertest, React Testing Library                |
| Tooling                 | npm workspaces, ESLint, Prettier                        |
| Deployment              | Render blueprint and frontend Vercel configuration      |

## Getting started

### Prerequisites

- Node.js 22 or 24, matching the engine range `>=22 <25`.
- npm 10 or newer.
- PostgreSQL; Neon is the project's target provider.

### 1. Install dependencies

Run from the repository root:

```sh
npm ci
```

### 2. Configure the environment

Copy the environment templates using PowerShell. Skip copying files that already contain your configuration.

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

| File            | Variable            | Purpose                                                             |
| --------------- | ------------------- | ------------------------------------------------------------------- |
| `backend/.env`  | `DATABASE_URL`      | PostgreSQL connection string supporting transactions                |
| `backend/.env`  | `JWT_SECRET`        | Random secret of at least 32 characters                             |
| `backend/.env`  | `JWT_EXPIRES_IN`    | Token lifetime; default `15m`                                       |
| `backend/.env`  | `PORT`              | API port; default `4000`                                            |
| `backend/.env`  | `CORS_ORIGIN`       | Exact frontend origin; locally `http://localhost:5173`              |
| `backend/.env`  | `PAYMENT_PROVIDER`  | `cod`, `simulated`, or `bkash`; use `cod` for basic local setup     |
| `backend/.env`  | `TEST_DATABASE_URL` | Isolated database for backend integration tests                     |
| `frontend/.env` | `VITE_API_URL`      | API URL including `/api/v1`; locally `http://localhost:4000/api/v1` |

The [backend template](backend/.env.example) also documents transaction timeouts and bKash configuration. Keep database credentials, JWT secrets, and payment credentials server-side. Never commit `.env` files.

### 3. Initialize the database

```sh
npm run db:generate -w backend
npm run db:migrate -w backend
npm run db:seed -w backend
```

The seed includes three users, five categories, twelve products, eight services, and five bundles.

### 4. Start development servers

```sh
npm run dev
```

| Application  | Local URL                           |
| ------------ | ----------------------------------- |
| Frontend     | http://localhost:5173               |
| Backend      | http://localhost:4000               |
| Health check | http://localhost:4000/api/v1/health |

Sign in with a demo account or register a Customer account. Public registration cannot create Admin or Technician accounts.

## Available commands

Run commands from the repository root:

| Command                          | Description                                   |
| -------------------------------- | --------------------------------------------- |
| `npm run dev`                    | Start both development servers                |
| `npm run lint`                   | Run ESLint in both workspaces                 |
| `npm run typecheck`              | Check TypeScript in both workspaces           |
| `npm test`                       | Run backend tests, followed by frontend tests |
| `npm run build`                  | Build both applications                       |
| `npm run format:check`           | Check repository formatting                   |
| `npm run db:generate -w backend` | Generate Prisma Client                        |
| `npm run db:migrate -w backend`  | Apply committed migrations                    |
| `npm run db:seed -w backend`     | Create or update demonstration data           |
| `npm run start -w backend`       | Start the compiled API after building         |

## Project structure

```text
ITMarts/
  backend/
    src/
      config/          Environment and database configuration
      middleware/      Authentication, errors, and request handling
      modules/         Domain routes, controllers, services, and validation
      app.ts           Express application and API routing
      seed.ts          Demo accounts and catalog data
    tests/             Backend automated tests
  frontend/
    src/
      api/             Axios client and API integration
  prisma/
    schema.prisma      PostgreSQL data model
    migrations/        Versioned database migrations
  docs/                API, deployment, and test documentation
  Plan.md              Approved engineering baseline
  render.yaml          Render deployment configuration
```

The React frontend calls Express under `/api/v1`. Domain services enforce business rules and access PostgreSQL through Prisma; controllers translate HTTP input and output.

## API conventions

Protected endpoints accept `Authorization: Bearer <access-token>`. Login uses `POST /api/v1/auth/login` with an `email` and `password` JSON body.

Success responses contain `success`, `data`, and optional `meta`:

```json
{
  "success": true,
  "data": {}
}
```

Error responses use a consistent envelope with optional error details:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "A readable error message"
  },
  "requestId": "request-correlation-id"
}
```

API references:

- [Authentication](docs/api/auth.md)
- [Catalog and orders](docs/api/catalog-orders.md)
- [Services and bookings](docs/api/services-bookings.md)
- [Additional modules](docs/api/phase-5-to-7.md)

## Testing and quality checks

Create a dedicated PostgreSQL database or isolated Neon test branch and set `TEST_DATABASE_URL` before backend tests. **Backend tests truncate application tables in their test database.** Never use a shared, demo, or production database for this value.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
```

For frontend tests only, run `npm run test -w frontend`. See the [release test matrix](docs/test-plan/release-test-matrix.md) for workflow and security coverage.

Access tokens are currently stored in browser memory, so refreshing the page requires signing in again.

## Deployment

The [Render blueprint](render.yaml) defines an API service and a static frontend. The API build installs dependencies, generates Prisma Client, applies migrations, and compiles the backend.

Configure backend secrets in the hosting dashboard and set `CORS_ORIGIN` to the frontend's exact origin. For a frontend using the supplied live API, set this value before building:

```dotenv
VITE_API_URL=https://itmart.onrender.com/api/v1
```

The blueprint selects `bkash`; configure its server-side credentials for payment integration, or select `cod` when deploying without payment-provider credentials. Configure SPA rewrites so frontend routes work on direct navigation.

Check `/api/v1/health`, then verify authentication and role-specific workflows separately. See the [operations runbook](docs/deployment-runbook.md) for deployment, rollback, and backup procedures.

## Contributing

Follow [AGENTS.md](AGENTS.md) and [Plan.md](Plan.md). Keep changes focused, validate external inputs, enforce authorization in the API, update documentation and relevant tests, and run quality checks before submitting changes. Record the reason for added production dependencies.
