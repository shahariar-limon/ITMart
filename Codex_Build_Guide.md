# Building the Project with Codex — Step-by-Step Engineering Guide

This assumes **Codex** (OpenAI's coding agent, CLI or IDE extension) as your build tool, working against the plan in `Improved_Project_Plan.md`. The core discipline: **Codex is a fast junior engineer, not an architect.** You decide scope and order (this doc does that for you); Codex writes code in small, reviewable chunks. Never ask it to "build the whole app" in one prompt — that's how you get a huge unreviewable diff full of silent bugs.

---

## Phase 0 — Project Setup & Guardrails (Day 1)

**Goal:** a repo Codex can work in safely, with rules it will actually follow.

1. Create the repo and the folder structure from Section 10 of the plan (`backend/`, `frontend/`, `docs/`).
2. Create an **`AGENTS.md`** file at the repo root. Codex reads this automatically for project-wide instructions. Include:
   - Tech stack (from Section 9 of the plan)
   - Folder conventions (one model/controller per file, etc.)
   - "Never trust client-side price/stock — always validate server-side"
   - "Do not add new npm dependencies without asking"
   - "Write or update tests for any new endpoint"
   - Coding style (naming, error-handling pattern, response shape e.g. `{ success, data, error }`)
3. Initialize git. Commit the empty structure + `AGENTS.md` before writing any real code, so every subsequent Codex change is a reviewable diff against a known baseline.
4. Set up `.env.example` for both `backend/` and `frontend/` (DB URI, JWT secret, storage keys, ports) — never let Codex commit a real `.env`.
5. First real Codex prompt of the project:
   > "Scaffold the backend as an Express + TypeScript project per AGENTS.md: server entrypoint, DB connection module using Mongoose, error-handling middleware, and a health-check route at `/api/health`. Don't add any business logic yet."
6. Second prompt, same pattern for the frontend:
   > "Scaffold the frontend as a Vite + React + TypeScript project with Tailwind configured, React Router set up with placeholder Home and Login pages, and an Axios instance in `src/api/` pointing at the backend base URL from an env variable."
7. **Checkpoint:** both apps run locally (`npm run dev`), health check responds, blank frontend loads. Commit.

---

## Phase 1 — Auth & Foundation (maps to Plan Section 5, M1)

1. Prompt Codex for the **User model** only:
   > "Create a Mongoose User model per the schema in Improved_Project_Plan.md Section 11: name, email, passwordHash, role (enum customer/technician/admin), timestamps. Add a pre-save hook to hash the password with bcrypt."
2. Prompt for **auth controller + routes**: register, login, `GET /me`. Ask explicitly for JWT signing, password comparison, and proper HTTP status codes (400/401/409 as appropriate) — don't let it default everything to 500.
3. Prompt for **auth middleware**: `requireAuth` (verifies JWT) and `requireRole(...roles)`. Ask Codex to attach `req.user` from the decoded token.
4. **Review pass (you, not Codex):** open the diff. Check: is the password ever returned in any response? Is the JWT secret read from env, not hardcoded? Is there a `select('-passwordHash')` on user queries?
5. Frontend: prompt for an `AuthContext`, login/register forms, protected route wrapper, and axios interceptor that attaches the JWT.
6. **Checkpoint:** register → login → hit a protected route → get 401 without token, 200 with token. Write this as your first Postman/Thunder Client collection entry in `docs/`. Commit.

---

## Phase 2 — Product Catalog (Plan M2, M3)

1. Model first, always: prompt for `Category` then `Product` models separately (small diffs are easier to review than one giant prompt for both).
2. Admin CRUD: prompt for product controller (create/update/delete/list-all-including-archived) + routes gated by `requireRole('admin')`.
3. Public read endpoints: `GET /products` with query params for category/brand/price range/sort/pagination, `GET /products/:id`.
4. **Review pass:** confirm pagination exists (no unbounded `find()`), confirm price/stock fields aren't writable by non-admins, confirm indexes are added for `category` and `brand` in the schema.
5. Frontend: product listing page with filters, product detail page, admin product-management screen (a table + a create/edit form).
6. **Checkpoint:** as admin, create a product; as anonymous user, see it in the listing, filter it, open its detail page. Commit.

---

## Phase 3 — Cart & Checkout (Plan M4, M5)

This is the phase most likely to have a subtle bug — **slow down here.**

1. Prompt for `Cart` model + endpoints (get/add/update/remove items).
2. Prompt for `Order` model + `POST /orders`. Be explicit in the prompt:
   > "When creating an order from the cart, re-fetch each product from the DB, recompute the total server-side using the current price, and reject the order with a 409 if any item's quantity exceeds current stock. Do not trust any price sent from the client."
3. **Review pass — this is mandatory, don't skip it:** read the order-creation controller line by line. Confirm it re-reads stock/price from DB, confirms atomicity (ideally a Mongoose transaction, or at minimum a stock check immediately before decrement), and only decrements stock after the order document is successfully created.
4. Prompt for order status update endpoint (admin-only), enforcing the pipeline `Pending → Confirmed → Processing → Shipped → Delivered → Completed` (+ `Cancelled`) — ask Codex to reject invalid transitions (e.g. `Delivered → Pending`).
5. Frontend: cart page, checkout flow, order confirmation, "my orders" list + detail.
6. **Checkpoint — the most important one in the project:** simulate overselling (two browser tabs, same last-unit item) and confirm the second checkout is rejected, not silently allowed. Commit.

---

## Phase 4 — Services & Booking (Plan M6)

1. Prompt for `Service` model, then `ServiceBooking` model separately.
2. Booking endpoints: create booking (customer), list bookings (scoped: own for customer, assigned for technician, all for admin — ask Codex to implement this scoping explicitly in the controller, not just in the frontend), assign technician (admin), update status (admin + assigned technician only).
3. **Review pass:** confirm a technician cannot view or update another technician's bookings — test this manually, don't just trust the code review.
4. Frontend: service listing, booking form (service + date/time + address), customer's booking list, technician dashboard (assigned bookings + status update), admin booking management (assign technician).
5. **Checkpoint:** book a service as customer → assign as admin → update status as technician → confirm customer sees the updated status. Commit.

---

## Phase 5 — Admin Dashboard (Plan M7)

1. Prompt for a single `GET /admin/dashboard` endpoint returning aggregated counts (products, orders, customers, pending orders, active bookings) plus a basic revenue sum — one aggregation query, not five separate round trips if avoidable.
2. Frontend: dashboard page with stat cards; add one or two Recharts visualizations (orders over time, orders by status) once the numbers display correctly.
3. **Checkpoint:** dashboard reflects real data after creating a few test orders/bookings. **This is your MVP demo point — tag this commit** (`git tag mvp-v1`).

---

## Phase 6 — Phase 2 Modules (build in this order, stop when time runs out)

1. **Reviews** — model + endpoints restricted to users with a completed order containing that product; frontend review form + display on product detail.
2. **Wishlist** — simplest module, good if you need a quick win.
3. **Product comparison** — no new model needed; a frontend feature that fetches N products and renders a spec diff table (specs are already a key-value map on Product).
4. **Solution bundles** — `Bundle` model referencing products + services; treat a bundle as a special cart line item that expands into its components at order-creation time.
5. **Notifications** (in-app) — a `Notification` model + creation hooks on key events (order placed, status changed, booking assigned) + a bell icon UI.
6. **Reporting** — aggregation endpoints over Orders/ServiceBookings; simple tables, export-to-CSV if time allows.

For each: model → endpoints → **review pass** → frontend → checkpoint → commit. Don't batch two Phase 2 modules into one Codex prompt.

---

## Phase 7 — Stretch / Phase 3 (only if MVP + Phase 2 are solid)

1. **Customized solution request + quotation** — this is a two-sided workflow (customer submits, admin builds a quote, customer accepts). Build and test each side independently before wiring them together:
   - `SolutionRequest` model + customer submission form
   - Admin quote-builder UI (pick products/services, set a price) writing to a `Quotation` model
   - Accept/reject endpoint that, on accept, creates a real Order from the quotation
2. **Business accounts** — a flag + bulk-pricing rule, not a new portal.
4. **Real payment gateway** — swap the simulated payment for a sandbox Stripe/equivalent integration behind the same internal interface, so the rest of the app doesn't need to change.

---

## Phase 8 — Testing, Hardening, Documentation, Deployment

1. Ask Codex to write integration tests for the flows you manually checked in each phase's checkpoint (auth, overselling prevention, role-gated 403s, booking scoping, status-transition validation).
2. Security pass: confirm every mutating route has `requireAuth` (and `requireRole` where needed), confirm no route trusts a client-supplied price/stock/role, confirm error responses never leak stack traces in production.
3. Fill in `docs/`: ER diagram, architecture diagram, API docs (expand Section 12 of the plan with real request/response examples), test plan, user manual.
4. Deploy: backend to Render/Railway, frontend to Vercel, DB on Atlas. Ask Codex to help write the deployment config/scripts, but set the actual environment variables yourself in each platform's dashboard — never hand secrets to the agent to type into a prompt.
5. Final walkthrough of the full user journey end-to-end on the deployed URL, then write the final report referencing the Academic Positioning section of the plan.

---

## Working Discipline (apply to every phase above)

- **One resource per prompt.** Model → controller → routes → frontend, as separate prompts, not one mega-prompt.
- **Read every diff before running it.** Especially anything touching price, stock, auth, or role checks.
- **Checkpoint = manually test, then commit.** Don't let Codex "move on" to the next module until the current one is verified by hand, not just by Codex saying it works.
- **If Codex's diff is large or touches files you didn't ask about, stop and ask it to explain why**, or revert and re-prompt more narrowly.
- **Keep AGENTS.md updated** as conventions solidify (e.g. once you settle on a response shape or error format, add it so future prompts stay consistent without you repeating it every time).
