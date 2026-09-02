# Release Test Matrix

| Area | Required evidence |
|---|---|
| Identity | Registration, login, invalid credentials, role escalation rejection |
| Authorization | Customer/Admin/Technician route denial and ownership isolation |
| Catalog | Admin mutation, public archive filtering, pagination and invalid filters |
| Commerce | Server pricing, stale stock, concurrent last unit, cart clearing |
| Orders | Valid state path, invalid transitions, cancellation restoration exactly once |
| Services | Three-role workflow, technician isolation, concurrent overlap rejection |
| Dashboard | Admin-only access and metrics from persisted records |
| Reviews | Completed-purchase requirement, duplicate rejection, ownership |
| Wishlist | Per-user isolation and idempotent add |
| Bundles | Component validation, transactional stock, generated service booking |
| Notifications | Recipient isolation, read and read-all behavior |
| Reports | Admin-only JSON and downloadable UTF-8 CSV |
| Quotations | Ownership, Admin quote, expiry, accept/reject, transactional conversion |
| Optional adapters | AI timeout fallback and simulated payment without card data |

Before release, manually verify keyboard navigation, visible focus, mobile layout, loading/empty/error states, deployed CORS, deep links, and the two end-to-end journeys described in `Plan.md`.

