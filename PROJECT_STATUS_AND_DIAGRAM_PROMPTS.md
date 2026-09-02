# ITMart Project Status and Diagram Generation Brief

## 1. Document purpose

This document records the current state of ITMart, the work completed so far, remaining work, immediate risks, and the primary delivery goal. It also contains detailed, reusable prompts for producing the project’s WBS, June–August Gantt chart, system architecture, rich picture, use case diagram, and PostgreSQL ERD.

Status date: **2 September 2026**  
Delivery model: **Solo developer, iterative MVP delivery**  
Application type: **Responsive IT ecommerce and technical-service platform**

## 2. Primary goal

Build and deploy a secure, responsive platform where customers can discover and purchase IT products, book technical services, and track orders and appointments from one account. Administrators must be able to manage the catalog, inventory, orders, services, bookings, technician assignments, and operational reporting. Technicians must only be able to access and progress jobs assigned to them.

The critical end-to-end journey is:

`Discover → Evaluate → Purchase or Book → Fulfil → Track → Complete`

The platform must prevent unauthorized access, client-side price manipulation, overselling, invalid order or booking transitions, and cross-customer or cross-technician data access.

## 3. Technology direction

| Layer | Current technology |
|---|---|
| Frontend | React 19, Vite, strict TypeScript, React Router, Axios, Tailwind CSS |
| API | Node.js, Express 5, strict TypeScript, REST under `/api/v1` |
| Validation | Zod |
| Authentication | JWT and bcrypt |
| Current application persistence | Mongoose queries and MongoDB-oriented tests remain in most modules |
| Target persistence | PostgreSQL on Neon through Prisma ORM |
| Testing | Vitest, Supertest, React Testing Library |
| Deployment | Vercel frontend, Render backend, Neon PostgreSQL |

> Important transition note: the approved baseline documents still describe MongoDB/Mongoose, while the active target is now Neon PostgreSQL/Prisma. The source-of-truth architecture documents must be updated after the migration is completed and verified.

## 4. Work completed

### 4.1 Foundation and API conventions

- Monorepo-style frontend and backend workspaces are established.
- Strict TypeScript configuration is present.
- Express API uses the `/api/v1` base path.
- Central error handling, request IDs, not-found handling, security headers, CORS, payload limits, and rate limiting are present.
- Success and error envelope conventions are defined.
- Environment configuration is validated with Zod.
- Deployment manifests and an operations runbook exist.

### 4.2 Authentication and authorization

- Customer registration, login, current-user lookup, and JWT authentication are implemented.
- Public registration is designed to create customer accounts only.
- Customer, Technician, and Admin authorization rules are represented in API middleware and protected frontend routes.
- Password hashing and safe user responses are implemented in the existing Mongoose version.

### 4.3 Product commerce

- Category and product management are implemented.
- Product listing, detail, search, filtering, sorting, and pagination exist.
- Persistent cart and bundle cart behavior exist in the MongoDB implementation.
- Checkout recalculates authoritative prices and totals on the server.
- Order line snapshots, inventory protection, order tracking, cancellation, and state-transition rules exist in the MongoDB implementation.
- COD and simulated-payment abstraction are represented; no real funds are processed.

### 4.4 Technical services

- Public service catalog and customer booking requests are implemented.
- Admin confirmation, technician assignment, scheduling, and booking management are represented.
- Technician-scoped access and workflow progression are represented.
- Schedule-overlap prevention exists in the MongoDB transaction implementation.

### 4.5 Release and administrative features

- Admin operational dashboard and summaries.
- Verified-purchase reviews.
- Wishlist and product comparison.
- Product-and-service bundles.
- In-app notifications.
- Sales and service reporting with CSV export.
- Customized solution requests and quotations.
- Business-account pricing fields.
- Optional AI-search fallback and payment-provider abstraction.

### 4.6 Frontend and landing page

- Responsive routes and role-specific pages exist for the implemented modules.
- The landing page has been redesigned into ten sections: hero, trust strip, categories, featured products, services, platform value, process, business impact, brand promise, and final call to action.
- The landing page includes accessible focus behavior and reduced-motion support.
- The latest frontend lint, TypeScript, unit tests, and production build completed successfully before the database migration began.

### 4.7 PostgreSQL/Prisma migration completed so far

- Prisma CLI and Prisma Client are pinned to version 6.15 in the backend workspace.
- A normalized PostgreSQL schema has been created in `prisma/schema.prisma`.
- UUID identifiers are used for opaque entity IDs.
- Integer fields are retained for authoritative monetary values.
- Prisma models cover users, categories, products, carts, cart items, services, bundles, orders, order snapshots, bookings, reviews, wishlists, notifications, solution quotations, and status-history records.
- Join tables normalize many-to-many relationships such as bundle products, bundle services, wishlist products, quote products, and quote services.
- The schema passed `prisma validate`.
- Initial migration `20260902145541_init` was created and applied successfully to the configured Neon `neondb` database.
- The backend database lifecycle now calls Prisma `$connect()` and `$disconnect()`.

## 5. Current progress assessment

| Area | State | Approximate progress |
|---|---|---:|
| Frontend user interface | Broad feature coverage; final end-to-end QA remains | 90% |
| Existing MongoDB API implementation | Broad feature coverage with automated tests | 90% |
| Prisma relational data model | Schema and initial Neon migration completed | 90% |
| Runtime conversion from Mongoose to Prisma | Started, but most queries still use Mongoose | 15% |
| PostgreSQL-compatible automated tests | Not yet converted | 5% |
| Documentation alignment | This status document added; baseline still references MongoDB | 55% |
| Deployment on PostgreSQL | Not ready until runtime conversion and tests pass | 25% |

Overall project completion is estimated at **approximately 70%**, but the application should not be treated as release-ready during the mixed Mongoose/Prisma transition.

## 6. What remains to be done

### Priority 1 — Finish the persistence migration

1. Resolve Prisma Client generation from the workspace-root schema.
2. Replace all Mongoose models, imports, query chains, `populate()` calls, aggregates, and ObjectId-specific logic.
3. Convert authentication and user queries to Prisma.
4. Convert categories, products, search, cart, bundle, wishlist, and review queries.
5. Convert order checkout and cancellation to Prisma interactive `$transaction()` operations.
6. Preserve conditional inventory decrement so concurrent checkout cannot make stock negative.
7. Convert booking assignment and scheduling to Prisma transactions.
8. Preserve overlap detection and concurrency control for technician schedules.
9. Convert notifications, reports, dashboards, and quotation acceptance.
10. Remove Mongoose and MongoDB-memory-server only after no production or test imports remain.

### Priority 2 — Convert and strengthen tests

- Replace MongoDB-memory-server test setup with a dedicated PostgreSQL test database or isolated Neon test branch.
- Reset test data using safe table truncation in dependency order.
- Retest authentication, role-based access, ownership isolation, price authority, overselling prevention, cancellation restoration, booking conflicts, and valid state transitions.
- Add relational-constraint and transaction rollback tests.
- Never point destructive test cleanup at the production Neon branch.

### Priority 3 — Align configuration and documentation

- Update `Plan.md`, `README.md`, deployment documentation, and `AGENTS.md` from MongoDB/Mongoose to PostgreSQL/Prisma.
- Update `.env.example` with a placeholder `DATABASE_URL`; never include a real credential.
- Update Render configuration with the Prisma generate and migrate-deploy commands.
- Record why Prisma and PostgreSQL driver dependencies are required.
- Document migration, backup, restore, and Neon branch practices.

### Priority 4 — Final release verification

- Seed representative categories, products, services, users, and demo transactions.
- Run lint, strict typecheck, all backend/frontend tests, and production builds.
- Perform desktop and mobile browser testing.
- Test a complete customer order journey and service-booking journey.
- Test Admin and Technician authorization boundaries.
- Run dependency and secret scanning.
- Deploy API and frontend, then verify `/api/v1/health` and primary workflows.

## 7. Immediate risks and controls

| Risk | Impact | Required control |
|---|---|---|
| Mixed Prisma and Mongoose runtime | API may compile or start inconsistently | Complete one domain at a time and keep the branch unreleased until all imports are converted |
| Production-like Neon URL used by tests | Accidental data loss | Use a separate test branch/database and assert its identity before truncation |
| Checkout race condition changes during migration | Overselling or partial orders | Use conditional `updateMany` inside a Prisma transaction and verify affected-row counts |
| Booking race condition changes | Double-booked technicians | Use a transaction plus concurrency/version control and conflict tests |
| Monetary representation drift | Incorrect totals | Keep integer minor units and server-side calculations |
| Old ObjectId assumptions | Invalid UUID handling or 500 responses | Replace ObjectId validation with UUID-aware Zod schemas and controlled 400/404 responses |
| Baseline documents still name MongoDB | Architecture inconsistency | Update documents only after migration behavior is verified |
| Secrets in local `.env` files | Credential exposure | Keep all `.env*` ignored except `.env.example`; rotate any credential ever committed |

## 8. Shared visual brief for every diagram

Use the following visual rules with each diagram prompt:

- Project title: **ITMart — Unified IT Commerce and Service Delivery Platform**.
- Style: professional university software-engineering report, modern and clean, not playful.
- Canvas: landscape, high resolution, readable when placed on an A4 report page.
- Palette: deep navy `#10212B`, emerald `#087F5B`, light mint `#D1FAE5`, slate `#64748B`, white, and pale gray `#F5F7F6`.
- Typography: clear sans-serif with strong hierarchy.
- Use consistent icons for Customer, Technician, Admin, web client, API, database, security, external service, and deployment platform.
- Keep connectors orthogonal where possible, avoid crossed lines, and include a legend.
- Use exact system names and relationships supplied below; do not invent unsupported features.
- Export as SVG or high-resolution PNG with an editable source version.

---

## 9. Prompt — Work Breakdown Structure (WBS)

```text
Create a complete hierarchical Work Breakdown Structure for “ITMart — Unified IT Commerce and Service Delivery Platform.” Use a landscape tree diagram with WBS numbering, four hierarchy levels where useful, and a legend showing Complete, In Progress, and Remaining.

Root node:
1.0 ITMart Project

Main deliverables and child packages:

1.1 Project Management and Requirements
- 1.1.1 Problem definition and stakeholder needs — Complete
- 1.1.2 Scope, MoSCoW priorities, acceptance criteria — Complete
- 1.1.3 Risk, schedule, and change control — In Progress
- 1.1.4 Final report and presentation — Remaining

1.2 Architecture and Foundation
- 1.2.1 Monorepo/workspaces and strict TypeScript — Complete
- 1.2.2 Express API conventions and middleware — Complete
- 1.2.3 React/Vite/Tailwind application shell — Complete
- 1.2.4 Environment validation and deployment manifests — In Progress
- 1.2.5 PostgreSQL/Prisma architecture alignment — In Progress

1.3 Identity and Access
- 1.3.1 Registration and login — Complete in Mongoose implementation
- 1.3.2 JWT authentication — Complete in Mongoose implementation
- 1.3.3 Customer/Admin/Technician authorization — Complete in Mongoose implementation
- 1.3.4 Prisma query conversion and PostgreSQL tests — Remaining

1.4 Product Commerce
- 1.4.1 Categories and product administration — Complete in Mongoose implementation
- 1.4.2 Search, filters, sorting, pagination — Complete in Mongoose implementation
- 1.4.3 Cart and bundle cart — Complete in Mongoose implementation
- 1.4.4 Transactional checkout and inventory protection — Complete in Mongoose; Prisma conversion Remaining
- 1.4.5 Order tracking, transitions, cancellation — Complete in Mongoose; Prisma conversion Remaining

1.5 Technical Services
- 1.5.1 Service catalog — Complete in Mongoose implementation
- 1.5.2 Customer booking request — Complete in Mongoose implementation
- 1.5.3 Admin scheduling and technician assignment — Complete in Mongoose implementation
- 1.5.4 Technician workflow and ownership controls — Complete in Mongoose implementation
- 1.5.5 PostgreSQL transaction and conflict conversion — Remaining

1.6 Extended Features
- 1.6.1 Reviews and verified purchase — Complete in Mongoose implementation
- 1.6.2 Wishlist and comparison — Complete in Mongoose implementation
- 1.6.3 Bundles and notifications — Complete in Mongoose implementation
- 1.6.4 Reports and CSV export — Complete in Mongoose implementation
- 1.6.5 Solution requests, quotations, business pricing — Complete in Mongoose implementation
- 1.6.6 Prisma runtime conversion — Remaining

1.7 User Experience
- 1.7.1 Role-specific pages — Complete
- 1.7.2 Ten-section landing page — Complete
- 1.7.3 Responsive and accessibility QA — In Progress
- 1.7.4 End-to-end browser validation — Remaining

1.8 Database Migration
- 1.8.1 Relational data analysis — Complete
- 1.8.2 Prisma schema and relations — Complete
- 1.8.3 Initial Neon migration — Complete
- 1.8.4 Prisma Client workspace generation — In Progress
- 1.8.5 Replace Mongoose queries — Remaining
- 1.8.6 Convert automated tests — Remaining
- 1.8.7 Remove MongoDB dependencies — Remaining

1.9 Quality and Release
- 1.9.1 Unit/integration tests for original implementation — Complete
- 1.9.2 PostgreSQL integration and security regression tests — Remaining
- 1.9.3 Lint, typecheck, test, build gates — In Progress
- 1.9.4 Vercel/Render/Neon deployment — Remaining
- 1.9.5 Demonstration and handover — Remaining

Show completion visually: green for Complete, amber for In Progress, and slate for Remaining. Include a small note that “Complete in Mongoose” requires PostgreSQL regression verification before release.
```

## 10. Prompt — Gantt Chart (June–August)

```text
Create a detailed Gantt chart for the ITMart project covering 1 June through 31 August. Use weekly columns labeled Jun W1–W4, Jul W1–W5, and Aug W1–W4. Show task dependencies, milestones as diamonds, and three workstreams: Planning/Foundation, MVP Features, and Quality/Migration. Assume a solo developer, so avoid unrealistic heavy overlap.

Schedule:
- Requirements, problem definition, and scope: 1–7 June
- Architecture, repository setup, strict TypeScript, API conventions: 8–14 June
- Authentication and role authorization: 15–21 June
- Product/category models, administration, listing, search and filters: 22 June–5 July
- Cart, checkout, inventory transaction, order lifecycle: 6–19 July
- Service catalog, booking, technician assignment and schedule protection: 20 July–2 August
- Admin dashboard and operational metrics: 3–9 August
- Reviews, wishlist, comparison, bundles and notifications: 10–16 August
- Reports, solution quotations and business pricing: 17–21 August
- Landing-page redesign and responsive UX refinement: 17–23 August
- Automated test expansion, security checks, documentation: 22–27 August
- PostgreSQL/Neon decision and relational schema design: 24–27 August
- Prisma schema validation and initial Neon migration: 28–29 August
- Mongoose-to-Prisma runtime conversion: 29–31 August, continuing after August
- PostgreSQL test conversion and deployment verification: show as a carry-over arrow into September

Milestones:
- M1 Foundation Ready — 14 June
- M2 Authentication Ready — 21 June
- M3 Product Discovery Ready — 5 July
- M4 Commerce Flow Ready — 19 July
- M5 Service Workflow Ready — 2 August
- M6 Feature-Complete Mongoose Baseline — 23 August
- M7 Neon Schema Applied — 29 August
- M8 PostgreSQL Release Candidate — after August / pending

Dependencies:
- Authentication depends on Foundation.
- Cart/Checkout depends on Product Catalog and Authentication.
- Booking depends on Authentication and Service Catalog.
- Dashboard/Reports depend on orders and bookings.
- PostgreSQL runtime conversion depends on relational schema and initial migration.
- Deployment depends on runtime conversion, PostgreSQL tests, security regression, and successful build.

Color completed June–August baseline work green, migration work amber, and carry-over work slate with a dashed continuation. Add a vertical “31 August” cutoff and a footnote that the database migration continues into September.
```

## 11. Prompt — System Architecture Diagram

```text
Create a layered system architecture diagram for ITMart using the target PostgreSQL architecture. Show trust boundaries, request flow, deployment destinations, and the authority of the backend.

Actors:
- Anonymous Visitor
- Customer
- Technician
- Administrator

Presentation layer:
- React 19 + Vite + TypeScript web application
- React Router protected routes
- Axios API client
- Tailwind responsive UI
- Deployment: Vercel

API layer:
- Node.js + Express 5 + strict TypeScript REST API
- Base route: /api/v1
- Middleware pipeline: Helmet → CORS allowlist → JSON size limit → Request ID → Rate limiting → Zod validation → JWT authentication → Role/ownership authorization
- Controllers translate HTTP input/output only
- Domain services contain business rules and transaction workflows
- Central AppError and production-safe error handler
- Deployment: Render

Domain modules:
- Authentication and Users
- Categories and Products/Search
- Cart and Bundles
- Orders, Checkout, Inventory and Payments abstraction
- Services and Bookings/Scheduling
- Reviews, Wishlist and Comparison
- Notifications
- Dashboard and Reports
- Solution Requests and Quotations

Data layer:
- Prisma ORM
- Prisma interactive $transaction for checkout, cancellation, quotation acceptance, and booking scheduling
- Neon PostgreSQL
- Relational constraints, UUID keys, indexes, normalized join tables, status-history tables
- Integer minor-unit money values

Optional external integration:
- Optional AI API with deterministic search fallback; never required by a core flow
- Future object storage/CDN for product image URLs

Show flows:
1. Browser sends HTTPS JSON REST request.
2. Middleware validates, authenticates, and authorizes.
3. Controller calls a domain service.
4. Service applies authoritative prices, ownership, inventory, status, and schedule rules.
5. Prisma performs parameterized queries or an atomic database transaction.
6. API returns the standard success/error envelope with request ID.

Emphasize with a highlighted note: “The API—not the client—is authoritative for roles, ownership, prices, totals, stock, schedules, and workflow transitions.” Show secrets flowing only from Vercel/Render/Neon environment stores, never from source control. Add a dashed box labeled “Migration state: legacy Mongoose queries still being replaced; do not deploy mixed persistence.”
```

## 12. Prompt — Rich Picture

```text
Create a rich picture for the ITMart business problem and proposed solution. Use a hand-drawn but professional systems-thinking style, with people, concerns, information flows, pain points, conflicts, and benefits. Do not make it a formal UML diagram.

Left side — current business problems:
- Customer faces disconnected product sales, phone/chat service requests, unclear prices, uncertain stock, and no unified tracking.
- Administrator manually reconciles catalog, inventory, orders, bookings, and technician availability.
- Technician receives incomplete job information and may be double-booked.
- Management lacks reliable operational counts and revenue visibility.
- Draw warning clouds for inconsistent pricing, overselling, scheduling conflicts, duplicated communication, unauthorized access, and slow status updates.

Center — ITMart platform boundary:
- Unified storefront and account
- Product discovery and comparison
- Secure server-calculated checkout
- Technical-service booking
- Order and appointment tracking
- Role-based dashboards
- Notifications and reports
- PostgreSQL transaction and integrity controls

Right side — desired outcomes:
- Customer: trusted products, simple booking, clear progress, one account
- Admin: centralized control, technician assignment, inventory accuracy, reporting
- Technician: only assigned jobs, clear schedule, controlled status updates
- Management: operational visibility and dependable data
- Organization: fewer manual errors, improved customer confidence, scalable foundation

External context:
- Vercel hosts the web application
- Render hosts the Express API
- Neon hosts PostgreSQL
- Optional AI provider assists search but has a deterministic fallback
- Future object storage provides product media

Show tension and governance:
- Convenience versus security
- Fast checkout versus stock consistency
- Flexible scheduling versus conflict prevention
- Rich features versus MVP scope
- Migration from MongoDB/Mongoose to PostgreSQL/Prisma

Use arrows labeled Browse, Buy, Book, Assign, Update, Notify, Report, and Track. Include thought bubbles with representative concerns such as “Is this in stock?”, “Who is available?”, “Can I see only my jobs?”, and “Are totals trustworthy?”. End with the value statement: “One role-aware platform connecting commerce, service delivery, and operational visibility.”
```

## 13. Prompt — Use Case Diagram

```text
Create a UML use case diagram for ITMart. Draw a clear system boundary named “ITMart Platform.” Use four actors: Visitor, Customer, Technician, and Administrator. Model Customer, Technician, and Administrator as specialized authenticated users where helpful.

Visitor use cases:
- Browse active products
- Search/filter/sort products
- View product details and reviews
- Browse active services and bundles
- Register
- Log in

Customer use cases:
- Manage own profile/session
- Manage cart
- Add bundle to cart
- Manage wishlist
- Compare products
- Place order
- View own orders
- Cancel eligible own order
- Request service booking
- View own bookings
- Cancel eligible booking
- Submit verified-purchase review
- Read notifications
- Submit customized solution request
- View quotation
- Accept or reject valid quotation

Technician use cases:
- View assigned bookings only
- View assigned schedule
- Start assigned job
- Add technician notes
- Advance allowed booking status
- Complete assigned job
- Read notifications

Administrator use cases:
- Manage categories and products
- Manage inventory
- Manage services and bundles
- View/manage all orders
- Advance order status
- Cancel eligible order
- View/manage all bookings
- Confirm booking
- Assign technician
- Schedule/reschedule booking
- Advance booking status
- Manage business-account settings
- Prepare solution quotation
- View dashboard
- Generate sales/service reports
- Export CSV

Relationships:
- “Place order” includes Authenticate, Validate cart, Re-read authoritative price/stock, Calculate totals, Process COD/simulated payment, Atomically decrement stock, Create immutable snapshots, and Notify customer.
- “Cancel order” includes Validate transition and Atomically restore inventory exactly once.
- “Submit review” includes Verify completed purchase.
- “Schedule booking” includes Validate technician role and Check schedule conflict.
- “Advance booking status” includes Validate role, ownership/assignment, and state transition.
- “Accept quotation” includes Validate quote/expiry and Atomically create order/bookings.
- All protected use cases include Authenticate; administrative use cases include Authorize Admin; technician operations include Authorize Assigned Technician.

Use <<include>> and <<extend>> labels correctly. Keep the diagram readable by grouping commerce, services, administration, and account use cases into packages inside the system boundary.
```

## 14. Prompt — ERD Diagram

```text
Create a detailed crow’s-foot Entity Relationship Diagram for the ITMart Neon PostgreSQL database represented by Prisma. Use UUID primary keys, mark PK/FK/UK fields, show optionality, identify junction tables, and group entities by Identity, Catalog, Commerce, Services, Engagement, and Solutions. Show important unique constraints and indexes in notes.

Identity:
- User(id PK UUID, name, email UK, passwordHash private, role enum, isActive, scheduleVersion, accountType enum, businessDiscountBps, createdAt, updatedAt)

Catalog:
- Category(id PK, name, slug UK, description, isActive, timestamps)
- Product(id PK, categoryId FK, name, sku UK, brand, description, tags array, imageUrls array, price integer, discount integer, stock integer, specs JSON, warranty, status enum, timestamps)
- Service(id PK, name, category, description, priceModel enum, basePrice integer, durationMinutes, isActive, timestamps)

Cart and bundles:
- Cart(id PK, userId FK UK, timestamps)
- CartItem(cartId PK/FK, productId PK/FK, quantity)
- Bundle(id PK, name, description, bundlePrice integer, isActive, timestamps)
- BundleProduct(bundleId PK/FK, productId PK/FK, quantity)
- BundleService(bundleId PK/FK, serviceId PK/FK)
- CartBundleItem(cartId PK/FK, bundleId PK/FK, quantity)

Orders:
- Order(id PK, orderNumber UK, userId FK, subtotal, discountTotal, grandTotal, currency, paymentMethod enum, paymentStatus enum, paymentReference nullable, status enum, shippingAddress, inventoryRestoredAt nullable, timestamps)
- OrderItem(id PK, orderId FK, productId FK, sourceBundleId nullable FK, nameSnapshot, skuSnapshot, quantity, unitPrice, lineTotal)
- OrderBundleItem(id PK, orderId FK, bundleId FK, nameSnapshot, quantity, unitPrice, lineTotal)
- OrderBundleService(orderBundleItemId PK/FK, serviceId PK/FK)
- OrderStatusHistory(id PK, orderId FK, from nullable enum, to enum, changedBy FK User, changedAt)

Bookings:
- ServiceBooking(id PK, bookingNumber UK, userId FK Customer, serviceId FK, technicianId nullable FK User, serviceNameSnapshot, basePriceSnapshot, durationMinutesSnapshot, status enum, preferredStart nullable, scheduledStart nullable, scheduledEnd nullable, address, customerNotes, technicianNotes, timestamps)
- BookingStatusHistory(id PK, bookingId FK, from nullable enum, to enum, changedBy FK User, changedAt)

Engagement:
- Review(id PK, userId FK, productId FK, rating, text, verifiedPurchase, timestamps), with composite UK(userId, productId)
- Wishlist(id PK, userId FK UK, timestamps)
- WishlistProduct(wishlistId PK/FK, productId PK/FK)
- Notification(id PK, recipientId FK User, type, title, message, resourceType nullable, resourceId nullable UUID, readAt nullable, timestamps)

Solutions and quotations:
- SolutionRequest(id PK, userId FK, title, requirements, status enum, quotedPrice nullable, adminNotes, expiresAt nullable, orderId nullable FK/UK, timestamps)
- SolutionQuoteProduct(solutionId PK/FK, productId PK/FK, quantity)
- SolutionQuoteService(solutionId PK/FK, serviceId PK/FK)

Cardinalities:
- Category 1 to many Product.
- User 1 to 0..1 Cart; Cart 1 to many CartItem and CartBundleItem.
- Product and Bundle each participate in many carts through junction rows.
- Bundle many-to-many Product through BundleProduct; Bundle many-to-many Service through BundleService.
- User 1 to many Order; Order 1 to many OrderItem, OrderBundleItem, and OrderStatusHistory.
- Product 1 to many OrderItem; Bundle 1 to many OrderBundleItem and optionally sourced OrderItem.
- OrderBundleItem many-to-many Service through OrderBundleService.
- Customer User 1 to many ServiceBooking; Technician User 1 to many optionally assigned ServiceBooking; Service 1 to many ServiceBooking.
- ServiceBooking 1 to many BookingStatusHistory.
- User many-to-many Product through Review and separately through Wishlist/WishlistProduct.
- User 1 to many Notification and SolutionRequest.
- SolutionRequest many-to-many Product through SolutionQuoteProduct and many-to-many Service through SolutionQuoteService.
- SolutionRequest 0..1 to 0..1 Order through unique nullable orderId.

Enums:
UserRole(customer, technician, admin)
AccountType(personal, business)
ProductStatus(active, archived)
PriceModel(fixed, starting_at, quote)
OrderStatus(pending, confirmed, processing, shipped, delivered, completed, cancelled)
PaymentMethod(cod, simulated)
PaymentStatus(unpaid, authorized)
BookingStatus(requested, confirmed, assigned, scheduled, in_progress, completed, cancelled)
SolutionStatus(submitted, quoted, accepted, rejected)

Add notes for indexes on product discovery, order user/status/date, booking technician/status/schedule, notification recipient/read/date, and solution user/status. Mark all monetary fields as integer minor units. Exclude passwordHash from public responses. Clearly label snapshot fields as immutable historical data.
```

## 15. Diagram quality checklist

Before accepting any generated diagram, verify that:

- Names match the implementation and this document.
- No diagram shows the browser directly accessing Neon.
- The API is shown as authoritative for prices, roles, stock, ownership, totals, and schedules.
- Customer and Technician data scopes are explicit.
- PostgreSQL/Prisma is presented as the target architecture.
- The ERD contains junction and history tables rather than MongoDB-style embedded arrays.
- Money is identified as integer minor units.
- The Gantt chart covers June through August and visibly carries unfinished migration work into September.
- The WBS distinguishes “implemented in Mongoose” from “verified on PostgreSQL.”
- Text remains readable on an A4 landscape page.

## 16. Recommended next checkpoint

The next checkpoint is complete only when Prisma Client generates successfully, all Mongoose imports are removed from production code, checkout and booking transactions use Prisma `$transaction()`, PostgreSQL-compatible integration tests pass, and the backend can complete both the customer order journey and technician service journey against a non-production Neon test branch.
