# Improved Project Plan

## Project Title
**ITMart — A Unified E-Commerce & Service Delivery Platform for IT Products and Solutions**

*(Working title — rename freely; kept distinct from generic "e-commerce" naming for academic framing.)*

---

## 0. Why This Version Is Different From the GPT Draft

The original draft is comprehensive but written like a wishlist — 18 modules, 4 roles, AI features, quotation workflows, audit logs, and full reporting, all presented as if equally urgent. For a **single-developer internship project on a real timeline**, that scope will not finish. This version keeps the same vision but:

1. Locks a **hard MVP boundary** (Section 3) that is realistically buildable solo in 8–10 weeks.
2. Cuts the role list from 4 to **3 practical roles** for v1 (Customer, Admin, Technician) — Business Customer becomes a *flag on the Customer model*, not a separate portal, until the MVP is stable.
3. Replaces "Customized IT Solution Request + Quotation" as a Phase-1 feature with a **Phase-2 stretch module** — it's the most interesting academic contribution, but it's also a mini state machine on top of a state machine, so it comes after the core commerce loop works.
4. Demotes AI features to **explicitly optional, isolated, and last** — with a clear fallback so a missing/rate-limited API key never breaks core checkout.
5. Adds things the original draft under-specified: non-functional requirements, a concrete ER-adjacent schema, a REST API surface, and a week-by-week timeline you can literally hand to a supervisor.

---

## 1. Project Overview

A specialized e-commerce and service-delivery platform for an IT solutions company, unifying:

- IT hardware and product sales (routers, cameras, servers, laptops, etc.)
- Technical services (installation, configuration, maintenance) as bookable, trackable items — not text descriptions
- Pre-built "solution bundles" (product + service combos, e.g. a CCTV package)
- Order, delivery, and service-appointment tracking
- Role-based administration (Admin, Technician, Customer)

The system demonstrates the full customer journey — discover → compare → buy/book → track → get supported — plus the business side: inventory, orders, technician assignment, and basic analytics.

---

## 2. Objectives

1. Build a working e-commerce storefront for IT products.
2. Let customers book/purchase technical services with real scheduling and status tracking.
3. Support IT "solution bundles" that combine products + services into one purchasable unit.
4. Give admins centralized control over catalog, inventory, orders, services, and technicians.
5. Implement secure, role-based authentication.
6. Provide an admin dashboard with basic analytics.
7. Architect the system so optional features (AI search/recommendations, business accounts, quotations) can be added without a rewrite.

---

## 3. Scope Control (Read This Before Writing Any Code)

### MVP — Must ship, non-negotiable
- Auth (register/login/JWT) + role-based access (Customer, Admin, Technician)
- Product catalog: categories, CRUD (admin), listing, detail page, search + filter + sort
- Cart → Checkout → Order (server-validated pricing & stock)
- Order tracking with a defined status pipeline
- Inventory that decrements on order and blocks overselling
- Services catalog + booking (request → schedule → assign technician → complete)
- Admin dashboard: products, orders, services, basic counts

### Phase 2 — Should have, build after MVP is demoed once
- Product comparison table
- Solution bundles (product+service packages)
- Wishlist
- Reviews & ratings
- Notifications (in-app)
- Reporting (sales/product/service reports)

### Phase 3 — Could have, only if time remains
- Business customer accounts
- Customized solution requests + quotation workflow
- AI recommendations / AI-assisted search
- Real payment gateway integration (sandbox is enough for MVP)
- PDF invoices, audit logs, support tickets

**Rule:** don't start a Phase 2 item while any MVP item is unfinished. Don't start Phase 3 while Phase 2 is unfinished. This is the single most important discipline for a solo academic project on a deadline.

---

## 4. Roles (v1)

| Role | Core capabilities |
|---|---|
| **Customer** | Register/login, browse/search/filter products, cart, checkout, view own orders, book services, view own service requests, leave reviews (Phase 2) |
| **Technician** | View assigned service requests, update status, add notes, mark complete |
| **Admin** | Full CRUD on products/categories/services, manage orders & their statuses, assign technicians, view dashboard |

*Business Customer* is deferred to Phase 3 as a boolean `accountType` on the Customer model plus a bulk-quantity allowance — not a separate portal — to avoid building a second UI track prematurely.

---

## 5. Core Modules (MVP Only — Phase 2/3 modules listed separately below)

### M1 — Auth & Authorization
JWT-based login, bcrypt password hashing, protected routes via middleware, role check middleware (`requireRole('admin')` etc.).

### M2 — Product Catalog
Fields: name, SKU, category, brand, description, images (URLs, stored via cloud storage — not in MongoDB), price, discount, stock, specs (flexible key-value map), warranty, status (active/archived).

### M3 — Product Discovery
Search by name/tag, filter by category/brand/price range/availability, sort by price/newest.

### M4 — Cart & Checkout
Cart stored per user (or session for guests, if time allows). Server recalculates price and validates stock at checkout — **never trust client-side totals.**

### M5 — Orders & Inventory
Order status pipeline:
`Pending → Confirmed → Processing → Shipped → Delivered → Completed` (+ `Cancelled` branch)
Stock decremented on order confirmation; restored on cancellation.

### M6 — Services & Booking
Services are first-class records (name, category, price model, duration estimate). Booking flow:
`Requested → Confirmed → Assigned → Scheduled → In Progress → Completed` (+ `Cancelled`)
Admin assigns a technician; technician updates status from their own view.

### M7 — Admin Dashboard
Totals: products, orders, customers, pending orders, active service requests, revenue (basic sum). One or two charts (orders over time, orders by status) — start with numbers, add charts once data exists.

---

## 6. Phase 2 Modules

- **Product Comparison** — pick 2–3 products in the same category, render a spec diff table.
- **Solution Bundles** — a `Bundle` model referencing N products + M services with a bundle price; purchasable as a single cart line item.
- **Wishlist** — simple saved-products list per user.
- **Reviews** — rating + text, restricted to users who purchased the item (`verifiedPurchase` check against Order history).
- **Notifications** — in-app only (a `Notification` collection + a bell icon), no email infrastructure needed for MVP.
- **Reporting** — aggregation queries over Orders/Services, exposed as admin-only endpoints and simple tables/charts.

## 7. Phase 3 Modules (Stretch)

- **Customized Solution Request + Quotation** — customer submits free-text requirement → admin manually builds a quote (products + services + price) → customer accepts/rejects → accepted quote becomes an Order. This is the most "academically impressive" piece but also the most complex state machine in the whole system — do it last, once everything it depends on (Orders, Products, Services) is solid.
- **Business Accounts** — bulk pricing, multiple order tracking.
- **AI Recommendations / AI Search** — must be optional and fail gracefully; wrap any AI call in a try/catch that falls back to normal filtered results.
- **Real payment gateway** (e.g. Stripe test mode) replacing the COD/simulated payment.
- **Audit logs, support tickets, PDF invoices.**

---

## 8. Non-Functional Requirements (missing from the original draft)

- **Security:** all mutating endpoints require auth; role checks server-side, never trusted from the frontend; input validation on every write (e.g. via a schema library); rate limiting on auth endpoints.
- **Performance:** paginate product/order lists (never return unbounded arrays); index MongoDB fields used in filters (`category`, `brand`, `status`).
- **Reliability:** price/stock checks happen server-side at order creation, not just at "add to cart" time (stock can change between the two).
- **Maintainability:** consistent folder structure (see Section 10), one Mongoose model per file, one controller per resource, environment config via `.env` (never committed).
- **Usability:** responsive layout (mobile + desktop), loading and error states on every data-fetching screen — this is graded as heavily as the backend in most academic rubrics.

---

## 9. Technology Stack

| Layer | Choice | Note |
|---|---|---|
| Frontend | React + Vite, TypeScript (recommended), Tailwind CSS, React Router, Axios | TS is optional but catches a lot of bugs Codex would otherwise introduce silently |
| Backend | Node.js + Express, TypeScript or JS | REST API |
| Database | MongoDB (Atlas) via Mongoose | |
| Auth | JWT + bcrypt | |
| File storage | Cloudinary or S3-compatible bucket | Never store images as base64 in MongoDB |
| Charts | Recharts | For the admin dashboard |
| Deployment | Vercel (frontend), Render/Railway (backend), Atlas (DB) | |

---

## 10. Suggested Repository Structure

```text
project-root/
  backend/
    src/
      models/          # one file per Mongoose schema
      controllers/      # one file per resource
      routes/
      middleware/        # auth, roleCheck, errorHandler
      config/            # db connection, env loader
      utils/
    tests/
    server.ts
  frontend/
    src/
      pages/
      components/
      features/          # cart, orders, services, admin — grouped by domain
      api/                # axios instances + endpoint functions
      context/            # auth context, cart context
      types/
    App.tsx
  docs/                  # ER diagram, API docs, test plan, report
  AGENTS.md              # instructions file Codex reads for project conventions
```

---

## 11. Suggested Data Model (MVP scope)

- **User** { name, email, passwordHash, role: customer|technician|admin, createdAt }
- **Product** { name, sku, category(ref), brand, description, price, discount, stock, images[], specs{}, status }
- **Category** { name, slug }
- **Cart** { user(ref), items: [{ product(ref), qty }] }
- **Order** { user(ref), items: [{ product(ref), qty, priceAtPurchase }], status, total, address, createdAt }
- **Service** { name, category, description, priceModel, durationEstimate }
- **ServiceBooking** { user(ref), service(ref), technician(ref, nullable), status, scheduledDate, address, notes }
- **Review** *(Phase 2)* { user(ref), product(ref), rating, text, verifiedPurchase }
- **Bundle** *(Phase 2)* { name, products[](ref), services[](ref), bundlePrice }

Exact field types/validation should be finalized when you write the Mongoose schemas — this is a starting contract, not a final spec.

---

## 12. REST API Surface (MVP)

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/products              (query: category, brand, minPrice, maxPrice, sort, page)
GET    /api/products/:id
POST   /api/products              [admin]
PUT    /api/products/:id          [admin]
DELETE /api/products/:id          [admin]

GET    /api/categories
POST   /api/categories            [admin]

GET    /api/cart
POST   /api/cart/items
PUT    /api/cart/items/:id
DELETE /api/cart/items/:id

POST   /api/orders                (creates order from cart, validates stock server-side)
GET    /api/orders                (own orders, or all orders if admin)
GET    /api/orders/:id
PUT    /api/orders/:id/status     [admin]

GET    /api/services
POST   /api/services              [admin]
POST   /api/bookings
GET    /api/bookings              (own bookings, or assigned bookings if technician, or all if admin)
PUT    /api/bookings/:id/status   [admin, technician]
PUT    /api/bookings/:id/assign   [admin]

GET    /api/admin/dashboard       [admin]
```

---

## 13. Testing Requirements

- **Unit/integration:** auth flow, stock-blocking on overselling, order status transitions, role-gated routes returning 403.
- **Edge cases:** checkout with stale/out-of-stock cart, double-booking a technician at the same time slot, unauthorized access to another user's order, invalid pagination/query params.
- **API testing:** Postman/Thunder Client collection checked into `docs/`.
- **Manual UI pass:** each core flow (browse → cart → checkout, book → assign → complete) on desktop + one mobile width.

---

## 14. Documentation Deliverables (for the academic report)

- Problem statement, objectives, scope (this document largely covers it)
- ER diagram (from Section 11)
- System architecture diagram (frontend/backend/DB/storage)
- API documentation (Section 12, expanded with request/response samples)
- Test plan + test cases
- User manual (screens + role walkthrough)
- Final report tying the "Academic Positioning" (Section 15) back to what was actually built

---

## 15. Academic Positioning

The contribution is the **integration**, not any single module in isolation: e-commerce + service booking + solution bundling + role-based operational management in one coherent system. Present it as an *integrated IT commerce and service-delivery platform*, and be explicit in the report about which Phase-2/3 items were or weren't reached — an honest scope note is worth more to a grader than an unfinished "everything" list.

---

## 16. Indicative Timeline (8–10 weeks, solo, part-time)

| Week | Focus |
|---|---|
| 1 | Repo setup, auth, DB connection, base layout |
| 2 | Product model + CRUD (admin) + public listing/detail |
| 3 | Search/filter/sort, cart |
| 4 | Checkout, order creation, inventory deduction |
| 5 | Order tracking UI, admin order management |
| 6 | Services model, booking flow, technician view |
| 7 | Admin dashboard, buffer for MVP bug-fixing |
| 8 | Phase 2: comparison, bundles, reviews (pick based on time left) |
| 9 | Testing pass, documentation, deployment |
| 10 | Buffer / stretch (Phase 3) / report writing |

