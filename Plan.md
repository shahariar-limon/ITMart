# ITMart — Software Engineering Project Plan

## Document Control

| Item | Value |
|---|---|
| Project | ITMart — Unified IT Commerce and Service Delivery Platform |
| Document | Consolidated Product and Engineering Plan |
| Status | Approved baseline for implementation |
| Delivery model | Solo developer, iterative delivery |
| Target duration | 8–10 weeks |
| Primary release | MVP v1.0 |

This document is the single source of truth for project scope, architecture, implementation, testing, deployment, and acceptance. It consolidates and supersedes `Improved_Project_Plan.md` and `Codex_Build_Guide.md`.

---

## 1. Executive Summary

ITMart is a responsive web platform for an IT solutions company. It combines product commerce and technical-service delivery in one system. Customers can discover and purchase IT products, book technical services, and track orders and appointments. Administrators manage the catalog, inventory, orders, bookings, and technician assignments. Technicians manage only the service jobs assigned to them.

The project will use an MVP-first approach. The primary success criterion is a secure, reliable end-to-end commerce and service-booking workflow. Optional features must not delay or destabilize the MVP.

### 1.1 Business problem

IT solution providers often manage product sales, service requests, inventory, and technician work through disconnected channels. This causes inconsistent pricing, poor status visibility, scheduling conflicts, and manual administrative work.

### 1.2 Proposed solution

Provide one role-based platform covering the complete journey:

`Discover → Evaluate → Purchase or Book → Fulfil → Track → Complete`

### 1.3 Project objectives

1. Deliver a functional storefront for IT products.
2. Support bookable and trackable technical services.
3. Prevent unauthorized access, invalid workflow transitions, and product overselling.
4. Give administrators centralized operational control and useful summary metrics.
5. Give technicians a restricted workspace for assigned jobs.
6. Establish a maintainable foundation for bundles, quotations, business accounts, and optional AI capabilities.

### 1.4 Success measures

- A customer can register, browse, check out, and track an order end to end.
- A customer can book a service; an admin can assign it; the assigned technician can complete it.
- Concurrent checkout cannot reduce stock below zero.
- Users cannot access another customer's private records or another technician's jobs.
- All critical automated tests pass in CI and the deployed health check is operational.
- Core pages work at mobile and desktop widths and expose clear loading, empty, success, and error states.

---

## 2. Scope and Priorities

The MoSCoW priority model is binding. Work may move to a lower tier only after the current tier satisfies its exit criteria.

### 2.1 MVP — Must have

- Authentication: registration, login, current-user session, logout, JWT access control.
- Authorization: Customer, Technician, and Admin roles enforced by the API.
- Product catalog: categories, admin CRUD, listing, detail, search, filtering, sorting, and pagination.
- Persistent customer cart.
- Checkout and order creation with server-calculated prices and atomic inventory updates.
- Order history, detail, and valid status tracking.
- Technical-service catalog and booking.
- Technician assignment, schedule-conflict prevention, and booking status tracking.
- Admin interfaces for products, categories, orders, services, bookings, and assignments.
- Technician interface for assigned bookings.
- Admin dashboard with operational counts and basic revenue metrics.
- Responsive UI, validation, centralized error handling, seed data, automated tests, and deployment documentation.
- COD or simulated payment only; no real funds are processed in the MVP.

### 2.2 Release 1.1 — Should have

Implement in this order, stopping when time or quality constraints require it:

1. Verified-purchase product reviews.
2. Wishlist.
3. Product comparison for two or three items in the same category.
4. Product-and-service solution bundles.
5. In-app notifications.
6. Sales and service reporting with CSV export.

### 2.3 Future releases — Could have

- Customized solution request and quotation workflow.
- Business-account flag, bulk pricing, and purchase limits.
- Real payment provider in sandbox mode behind a provider interface.
- Optional AI-assisted search and recommendations with deterministic fallback.
- PDF invoices, support tickets, audit history, email/SMS notifications.

### 2.4 Explicitly out of scope for MVP

- Native mobile applications.
- Multi-vendor marketplace behavior.
- Internationalization, multi-currency, or multi-warehouse inventory.
- Guest checkout.
- Recurring billing, refunds, returns, or real payment settlement.
- Live technician geolocation or route optimization.
- A separate business-customer portal.
- AI as a dependency of any core workflow.

### 2.5 Change control

Any proposed scope addition must state its user value, effort, dependencies, risks, and displaced work. Scope changes are accepted only when MVP milestones and quality gates remain achievable. Deferred work belongs in the backlog, not in partially implemented production paths.

---

## 3. Users and Permissions

| Capability | Customer | Technician | Admin |
|---|:---:|:---:|:---:|
| Browse active products/services | Yes | Yes | Yes |
| Manage own cart and checkout | Yes | No | Optional |
| View own orders/bookings | Yes | No | All |
| Create a service booking | Yes | No | Optional |
| View assigned service bookings | No | Yes | All |
| Update assigned booking status/notes | No | Yes | Yes |
| Manage catalog and inventory | No | No | Yes |
| Change order status | No | No | Yes |
| Assign technicians | No | No | Yes |
| View operational dashboard | No | No | Yes |

Authorization is always enforced server-side. Frontend route guards improve user experience but are not security controls.

---

## 4. Functional Requirements and Acceptance Criteria

### FR-01 Authentication and identity

- Users register with a unique normalized email and a password that meets the configured policy.
- Passwords are hashed with bcrypt and never returned or logged.
- Login returns an access token and safe user profile.
- Protected endpoints return `401` for missing/invalid credentials and `403` for insufficient permission.
- Public registration can create Customer accounts only. Admin and Technician roles are assigned administratively or through seed/setup tooling.
- Auth endpoints are rate-limited.

### FR-02 Product and category management

- Admins can create, edit, archive, and view products and categories.
- Product SKU and category slug are unique.
- Public endpoints expose active products only.
- Product images are stored as external object-storage URLs, never as database base64 payloads.
- Archiving is preferred over hard deletion when a product is referenced by an order.

### FR-03 Product discovery

- Customers can search by name, SKU, brand, and configured tags.
- Filters include category, brand, price range, and availability.
- Sort options include newest, price ascending, and price descending.
- Lists are paginated with bounded page size and return pagination metadata.
- Invalid query values return a validation error rather than an internal error.

### FR-04 Cart

- An authenticated customer can add, update, and remove active products.
- Quantity must be a positive integer and cannot exceed a configured per-line limit.
- Cart display totals are estimates; final price and availability are recalculated during checkout.
- Archived or unavailable products are clearly identified and cannot be ordered.

### FR-05 Checkout, orders, and inventory

- The API ignores any client-supplied total or authoritative unit price.
- Checkout re-reads current products, validates active status and stock, snapshots product name/SKU/unit price, calculates totals, creates the order, and decrements stock within one MongoDB transaction.
- Concurrent checkouts must use a conditional stock update so inventory can never become negative.
- A stock conflict returns `409 Conflict`; no partial order or inventory mutation remains.
- A successfully placed order starts as `Pending` and clears the purchased cart items.
- Eligible cancellation restores inventory exactly once within a transaction.
- Historical order lines remain unchanged if product data or prices later change.

Order state machine:

```text
Pending → Confirmed → Processing → Shipped → Delivered → Completed
   └──────────────→ Cancelled
Confirmed ────────→ Cancelled
```

Only `Pending` and `Confirmed` orders can be cancelled in MVP. Invalid or duplicate transitions return `409 Conflict`. `Shipped`, `Delivered`, `Completed`, and `Cancelled` are not cancellable in MVP.

### FR-06 Services and bookings

- Admins manage active technical services, pricing model, duration, and description.
- Customers submit a preferred start time, service address, and notes.
- An admin confirms/schedules the request and assigns an active Technician.
- The system prevents overlapping active bookings for the same technician using scheduled start/end timestamps.
- A Technician can see and modify only assigned bookings.
- Customers can see only their own bookings.

Booking state machine:

```text
Requested → Confirmed → Assigned → Scheduled → In Progress → Completed
    └───────────────→ Cancelled
Confirmed ──────────→ Cancelled
Assigned ───────────→ Cancelled
Scheduled ──────────→ Cancelled
```

Only Admin can assign or reschedule. Admin and the assigned Technician may advance operational status; every transition is validated by the API. Completed and Cancelled bookings are terminal.

### FR-07 Administration and dashboard

- Admin screens cover catalog, inventory, orders, services, bookings, and technician assignment.
- Dashboard metrics include total active products, customers, orders, pending orders, active bookings, and revenue from non-cancelled orders.
- Charts include orders over time and orders by status.
- Metrics use documented definitions and the same timezone convention.

### FR-08 Auditability

- MVP records timestamps and relevant actors on order/booking status changes.
- Application logs include a request/correlation ID but exclude secrets, passwords, authorization headers, and unnecessary personal data.
- A dedicated immutable audit-log module is deferred to a future release.

---

## 5. Non-Functional Requirements

### 5.1 Security

- Apply OWASP-aligned controls: schema validation, output encoding, safe headers, CORS allowlist, rate limiting, payload limits, and centralized error sanitization.
- Store secrets only in environment variables or deployment secret stores; commit `.env.example`, never `.env`.
- Use least-privilege database and cloud-storage credentials.
- Do not expose production stack traces or internal database errors.
- Validate MongoDB identifiers and prevent operator injection/mass assignment by allowlisting write fields.
- Define token expiry. For MVP, store the JWT consistently and document the XSS/CSRF trade-off; prefer secure, HttpOnly, SameSite cookies if frontend and API deployment topology supports them.
- Run dependency and secret scanning before release.

### 5.2 Performance and scalability

- Target p95 API response under 500 ms for normal list/detail operations in the demo environment, excluding third-party latency.
- Default page size: 20; maximum: 100.
- Index common query fields such as email, SKU, slug, product status/category/brand, order user/status/createdAt, and booking technician/status/scheduledStart.
- Avoid N+1 database queries and unbounded collection reads.
- Store media in object storage/CDN.

### 5.3 Reliability and data integrity

- Use MongoDB transactions for checkout and inventory-restoring cancellation; deployment must use a replica set or Atlas configuration that supports transactions.
- Make inventory restoration idempotent through transition validation and transaction boundaries.
- Validate configuration and fail fast at application startup when required variables are absent.
- Provide graceful shutdown and a health endpoint.
- Define backup/restore procedures for production data before launch.

### 5.4 Accessibility and usability

- Target WCAG 2.1 AA fundamentals: keyboard access, visible focus, labels, semantic structure, adequate contrast, and meaningful error messages.
- Support current desktop and mobile versions of Chrome, Edge, Firefox, and Safari.
- Every asynchronous page provides loading, empty, success, and failure states.
- Destructive UI actions require confirmation.

### 5.5 Maintainability

- TypeScript strict mode on frontend and backend.
- Feature/domain-based modules with controllers kept thin and business logic in services.
- Shared validation and documented response contracts.
- Linting, formatting, automated tests, and CI are required merge gates.
- New production dependencies require an explicit rationale and security/licensing review.

---

## 6. Technical Architecture

### 6.1 Approved technology stack

| Layer | Technology |
|---|---|
| Web client | React, Vite, TypeScript, React Router, Tailwind CSS |
| Data fetching | Axios plus a consistent query/cache approach selected during setup |
| API | Node.js, Express, TypeScript, REST |
| Validation | Zod or equivalent schema validation |
| Database | MongoDB Atlas with Mongoose |
| Authentication | JWT and bcrypt |
| Media | Cloudinary or S3-compatible object storage |
| Charts | Recharts |
| Testing | Vitest/Jest, Supertest, React Testing Library, and one E2E framework |
| Deployment | Vercel for web, Render/Railway for API, Atlas for database |
| CI | GitHub Actions or equivalent |

Pin supported runtime versions in project configuration and document them in the README. Do not mix JavaScript and TypeScript implementations without a documented exception.

### 6.2 Logical architecture

```text
Browser
  │ HTTPS / REST
  ▼
React Web Application
  │ /api/v1
  ▼
Express API
  ├── Authentication and authorization
  ├── Validation and error handling
  ├── Domain services and state-transition policies
  ├── Mongoose repositories/models ──► MongoDB Atlas
  └── Media adapter ─────────────────► Object storage/CDN
```

The API is the authority for permissions, prices, totals, inventory, schedules, and workflow transitions.

### 6.3 Repository structure

```text
project-root/
  backend/
    src/
      config/
      modules/
        auth/
        users/
        products/
        categories/
        carts/
        orders/
        services/
        bookings/
        admin/
      middleware/
      shared/
      app.ts
      server.ts
    tests/
  frontend/
    src/
      app/
      api/
      components/
      features/
      layouts/
      pages/
      types/
  docs/
    api/
    diagrams/
    test-plan/
    user-guide/
  .github/workflows/
  AGENTS.md
  Plan.md
  README.md
```

Each backend domain may contain its model, validation schema, service, controller, routes, and tests. Cross-domain abstractions belong in `shared/` only after genuine reuse exists.

### 6.4 API conventions

- Base path: `/api/v1`.
- JSON success envelope: `{ "success": true, "data": ..., "meta": ... }`.
- JSON error envelope: `{ "success": false, "error": { "code": "...", "message": "...", "details": [...] }, "requestId": "..." }`.
- Use standard status codes: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, and `500` as appropriate.
- Use ISO 8601 UTC timestamps at API/storage boundaries; convert for display in the UI.
- Use a consistent pagination contract: `page`, `limit`, `totalItems`, and `totalPages`.
- Generate OpenAPI documentation from the implemented contract or keep a reviewed specification synchronized with it.

---

## 7. Data Model

All records use MongoDB ObjectIds and timestamps unless stated otherwise.

### User

`name`, `email` (unique, normalized), `passwordHash` (private), `role` (`customer | technician | admin`), `isActive`.

### Category

`name`, `slug` (unique), `description`, `isActive`.

### Product

`name`, `sku` (unique), `categoryId`, `brand`, `description`, `tags[]`, `imageUrls[]`, `price`, `discount`, `stock`, `specs`, `warranty`, `status` (`active | archived`).

Money is represented consistently using integer minor units or MongoDB Decimal128; floating-point arithmetic is not permitted for authoritative totals.

### Cart

`userId` (unique), `items[{ productId, quantity }]`.

### Order

`orderNumber` (unique), `userId`, `items[{ productId, nameSnapshot, skuSnapshot, quantity, unitPrice, lineTotal }]`, `subtotal`, `discountTotal`, `grandTotal`, `currency`, `paymentMethod`, `paymentStatus`, `status`, `shippingAddress`, `statusHistory[{ from, to, changedBy, changedAt }]`, `inventoryRestoredAt`.

### Service

`name`, `category`, `description`, `priceModel`, `basePrice`, `durationMinutes`, `isActive`.

### ServiceBooking

`bookingNumber` (unique), `userId`, `serviceId`, `technicianId` (nullable), `status`, `scheduledStart`, `scheduledEnd`, `address`, `customerNotes`, `technicianNotes`, `statusHistory[]`.

### Phase 2 entities

- `Review`: `userId`, `productId`, `rating`, `text`, `verifiedPurchase`; unique per user/product unless policy changes.
- `Wishlist`: `userId`, `productIds[]`.
- `Bundle`: product/service components, snapshots or expansion rules, bundle price, and active status.
- `Notification`: recipient, type, payload, read timestamp.

Detailed schema constraints and indexes must be captured in code and the ER diagram before each module is considered complete.

---

## 8. MVP API Surface

```text
GET    /api/v1/health

POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me

GET    /api/v1/products
GET    /api/v1/products/:productId
POST   /api/v1/products                         [Admin]
PATCH  /api/v1/products/:productId              [Admin]
DELETE /api/v1/products/:productId              [Admin; archive semantics]

GET    /api/v1/categories
POST   /api/v1/categories                       [Admin]
PATCH  /api/v1/categories/:categoryId           [Admin]

GET    /api/v1/cart                             [Customer]
POST   /api/v1/cart/items                       [Customer]
PATCH  /api/v1/cart/items/:productId            [Customer]
DELETE /api/v1/cart/items/:productId            [Customer]

POST   /api/v1/orders                           [Customer]
GET    /api/v1/orders                           [Customer own; Admin all]
GET    /api/v1/orders/:orderId                  [Owner or Admin]
PATCH  /api/v1/orders/:orderId/status           [Admin]
POST   /api/v1/orders/:orderId/cancel           [Eligible owner or Admin]

GET    /api/v1/services
POST   /api/v1/services                         [Admin]
PATCH  /api/v1/services/:serviceId              [Admin]

POST   /api/v1/bookings                         [Customer]
GET    /api/v1/bookings                         [Role-scoped]
GET    /api/v1/bookings/:bookingId              [Role-scoped]
PATCH  /api/v1/bookings/:bookingId/assignment   [Admin]
PATCH  /api/v1/bookings/:bookingId/schedule     [Admin]
PATCH  /api/v1/bookings/:bookingId/status       [Admin or assigned Technician]
POST   /api/v1/bookings/:bookingId/cancel       [Eligible owner or Admin]

GET    /api/v1/admin/dashboard                  [Admin]
```

Routes must be finalized in OpenAPI with validation schemas, authorization rules, example requests/responses, and documented errors.

---

## 9. Delivery Plan

### Phase 0 — Foundation (Week 1)

**Deliverables**

- Repository structure, `AGENTS.md`, README, `.env.example`, lint/format/type-check scripts.
- Express application, validated configuration, MongoDB connection, centralized errors, request IDs, health endpoint, and graceful shutdown.
- React shell, routing, responsive layouts, API client, and initial design tokens.
- Test harness, CI workflow, and local seed strategy.

**Exit criteria:** clean installation from README; both apps run; health check succeeds; CI passes.

### Phase 1 — Authentication and authorization (Week 1–2)

**Deliverables**

- User model, registration/login/me endpoints, auth/role middleware, auth rate limiting.
- Login/register UI, session handling, protected routes, and role navigation.
- Tests for duplicate registration, password safety, invalid token, `401`, and `403` behavior.

**Exit criteria:** Customer cannot self-assign elevated roles; protected flows work with correct role isolation.

### Phase 2 — Catalog and discovery (Week 2–3)

**Deliverables**

- Category/Product schemas, indexes, admin CRUD/archive behavior.
- Public paginated listing/detail with search, filter, and sort.
- Storefront pages and admin catalog management.

**Exit criteria:** Admin-created products appear publicly when active; query combinations and pagination are tested.

### Phase 3 — Cart, checkout, orders, inventory (Week 3–5)

**Deliverables**

- Cart endpoints and UI.
- Transactional checkout, immutable line snapshots, conditional stock decrement, order state policy, cancellation/restoration.
- Customer order pages and admin order management.

**Exit criteria:** automated and manual concurrent-last-item test proves the second checkout fails cleanly; invalid transitions and double restoration are prevented.

### Phase 4 — Services and booking (Week 5–6)

**Deliverables**

- Service and booking modules.
- Role-scoped queries, technician assignment, scheduling, overlap checks, and state policy.
- Customer, Admin, and Technician booking interfaces.

**Exit criteria:** complete Customer → Admin → Technician → Customer workflow passes; cross-user and cross-technician access tests pass.

### Phase 5 — Dashboard and MVP stabilization (Week 7)

**Deliverables**

- Admin metrics and charts.
- Accessibility, responsive, error-state, logging, security, and performance pass.
- Seed/demo data and MVP end-to-end test.

**Exit criteria:** all MVP acceptance criteria pass in a staging-like environment. Create the `mvp-v1` tag only after approval.

### Phase 6 — Release 1.1 options (Week 8)

Implement Should-have items sequentially. Each item must include its schema/contract, API, UI, tests, documentation, and acceptance review before another begins.

### Phase 7 — Release preparation (Week 9)

- Complete test matrix and resolve all critical/high defects.
- Produce diagrams, API reference, test report, user guide, and operational runbook.
- Deploy frontend/API/database, configure secrets, verify CORS and production logging.
- Execute smoke, accessibility, and end-to-end tests against the deployed system.

### Phase 8 — Buffer and final report (Week 10)

- Address deployment defects and supervisor feedback.
- Complete final report and demonstration script.
- Attempt Future-release work only if release gates remain green.

---

## 10. Engineering Workflow

### 10.1 Work-item sequence

For each domain resource:

1. Confirm acceptance criteria and API/schema contract.
2. Implement model and validation.
3. Implement domain service and authorization policy.
4. Add controller/routes and integration tests.
5. Implement frontend states and component tests.
6. Perform code review, manual checkpoint, and documentation update.
7. Commit a focused, reviewable change.

Do not combine unrelated features in one change. Any change involving authentication, permissions, money, inventory, or workflow transitions requires line-by-line review and negative-path tests.

### 10.2 Branching and commits

- Protect the default branch; use short-lived feature branches when repository hosting supports it.
- Use clear commits, preferably Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Pull requests must summarize behavior, risks, tests, screenshots where relevant, and migrations/configuration changes.
- Do not commit generated secrets, `.env`, real customer data, build output, or dependency directories.

### 10.3 AI-assisted development guardrails

- Give the coding agent one bounded, testable change at a time and reference this plan plus `AGENTS.md`.
- Review every diff; agent output is untrusted until tested.
- Never include credentials, production data, or private tokens in prompts.
- Reject unexplained dependencies or unrelated file changes.
- Require tests for new endpoints and update project conventions when a reusable decision is made.
- AI-generated code must meet the same review, licensing, security, and quality gates as human-written code.

---

## 11. Quality Strategy

### 11.1 Automated testing

| Level | Focus |
|---|---|
| Unit | Price calculation, validators, permission policies, state transitions, scheduling overlap logic |
| API integration | Auth, resource CRUD, ownership, role gates, checkout transaction, cancellation restoration |
| Frontend component | Forms, validation, states, role-aware UI, accessible interactions |
| End to end | Browse → cart → checkout → track; book → assign → execute → complete |

Critical test cases include:

- Duplicate email and invalid credentials.
- Customer attempting Admin/Technician operations.
- Customer reading another customer's order or booking.
- Technician reading/updating another technician's booking.
- Invalid IDs, query parameters, quantities, prices, dates, and state transitions.
- Product archived or stock changed after it entered the cart.
- Two simultaneous purchases of the last unit.
- Cancellation repeated or attempted after shipment.
- Overlapping technician assignments.
- Empty, loading, network-failure, and server-error UI behavior.

### 11.2 Release gates

- Lint, format check, type check, build, and automated tests pass.
- No known Critical or High severity defects.
- No committed secrets and no Critical/High dependency vulnerabilities without documented mitigation.
- MVP end-to-end flows pass on the deployed environment.
- API contract, README, test evidence, and user guide match the implementation.

### 11.3 Definition of Done

A work item is done only when:

- Its acceptance criteria and negative cases pass.
- Authorization and validation are implemented server-side.
- Tests are added/updated and CI passes.
- Loading, empty, error, and responsive UI states are handled where relevant.
- API and user-facing documentation are updated.
- The change has been reviewed and contains no exposed secrets or unrelated modifications.

---

## 12. DevOps and Operations

### 12.1 Environments

- **Local:** developer machine with non-production data.
- **Staging/demo:** production-like deployment used for validation and presentation.
- **Production:** optional academic release; isolated secrets and database.

Environment variables include database URI, JWT configuration, allowed origin, media credentials, application URLs, log level, and port. Exact names live in `.env.example`.

### 12.2 CI/CD pipeline

1. Install from lockfile.
2. Lint and format check.
3. Type check.
4. Run backend/frontend tests.
5. Build applications.
6. Run dependency/secret checks.
7. Deploy only from an approved green revision.
8. Run post-deployment health and smoke checks.

### 12.3 Observability and support

- Structured server logs with severity, timestamp, request ID, route, status, and duration.
- `/api/v1/health` reports process health without leaking configuration.
- Production errors show a safe message to users and retain diagnostic context in logs.
- Document deployment, rollback, database backup/restore, seed/demo accounts, and known limitations in an operational runbook.

---

## 13. Risks and Mitigations

| Risk | Likelihood / Impact | Mitigation |
|---|---|---|
| Scope expansion prevents completion | High / High | Enforce priority tiers and exit criteria; backlog all additions |
| Overselling or partial checkout | Medium / Critical | Transactions, conditional updates, concurrency integration tests |
| Broken role/ownership isolation | Medium / Critical | Central policies, scoped queries, negative authorization tests |
| Technician double-booking | Medium / High | Start/end model, conflict check, index strategy, integration tests |
| Schedule slips due to UI/backend rework | Medium / High | Contract-first vertical slices and weekly demonstrable checkpoints |
| Deployment lacks transaction support | Medium / High | Use Atlas/replica set and verify transactions during Phase 0 |
| Secrets or personal data leak | Low / Critical | Env templates, secret scanning, log redaction, synthetic demo data |
| Third-party media/deployment outage | Medium / Medium | Adapter boundary, graceful errors, documented fallback/demo assets |
| AI-generated defects or excess dependencies | Medium / High | Bounded tasks, diff review, tests, dependency approval policy |
| Accessibility postponed until the end | Medium / Medium | Include accessibility in component Definition of Done |

---

## 14. Documentation Deliverables

- README with prerequisites, setup, commands, environment variables, and architecture overview.
- ER diagram and system/deployment architecture diagrams.
- OpenAPI specification and/or generated API reference with examples.
- Postman/Bruno/Thunder Client collection for demonstrable endpoints.
- Requirements traceability matrix mapping functional requirements to tests.
- Test plan, test cases, results, and known-defect list.
- Role-based user guide with screenshots.
- Deployment/rollback/backup runbook.
- Final academic report describing the problem, design decisions, implementation, evaluation, scope achieved, limitations, and future work.

---

## 15. Milestones and Governance

| Milestone | Target | Approval evidence |
|---|---|---|
| M0 Foundation ready | End Week 1 | Local startup and green CI |
| M1 Identity and catalog ready | End Week 3 | Role tests and catalog demo |
| M2 Commerce flow ready | End Week 5 | Concurrent checkout and order demo |
| M3 Service flow ready | End Week 6 | Three-role booking demo |
| M4 MVP feature complete | End Week 7 | MVP acceptance checklist |
| M5 Release candidate | End Week 9 | Deployed E2E tests and release gates |
| M6 Final delivery | End Week 10 | Documentation, report, and presentation |

At each weekly checkpoint, record completed acceptance criteria, test results, blockers, risks, scope changes, and next-week commitments. Progress is measured by verified outcomes, not files created or percentage estimates.

---

## 16. Final MVP Acceptance Checklist

- [ ] A new Customer can register and authenticate securely.
- [ ] Admin and Technician privileges cannot be obtained through public registration or client payloads.
- [ ] Admin can manage categories, products, services, orders, and bookings.
- [ ] Public product discovery supports bounded pagination, search, filter, and sort.
- [ ] Customer cart and checkout use server-authoritative pricing.
- [ ] Concurrent checkout cannot oversell inventory.
- [ ] Order states and cancellation inventory restoration follow the defined policy.
- [ ] Customer can track only their own orders and bookings.
- [ ] Admin can assign and schedule an available Technician.
- [ ] Technician can access and update only assigned work.
- [ ] Booking conflict and state-transition rules are enforced.
- [ ] Dashboard uses real data and documented metric definitions.
- [ ] Critical automated tests and deployed E2E smoke tests pass.
- [ ] Responsive, error, empty, loading, keyboard, and focus states are verified.
- [ ] Secrets, production stack traces, and sensitive fields are not exposed.
- [ ] README, API reference, diagrams, test report, user guide, and runbook are complete.

---

## 17. Academic Positioning

The project's primary contribution is the integration of product commerce, inventory integrity, technical-service scheduling, and role-based operational management in one coherent platform. The evaluation should emphasize secure workflow design, transactional correctness, access isolation, usability, and evidence-based testing rather than the number of optional features attempted.

The final report must state exactly which priority tier was delivered. A smaller, verified system is considered more successful than a larger collection of incomplete modules.
