# Phase 5–7 API Additions

- `GET /admin/dashboard` — Admin operational metrics and chart series.
- `GET|POST /products/:productId/reviews`; `PATCH|DELETE /reviews/:reviewId` — verified reviews.
- `GET /wishlist`, `POST /wishlist/items`, `DELETE /wishlist/items/:productId` — Customer wishlist.
- `GET|POST|PATCH|DELETE /bundles` — public discovery and Admin management.
- `POST|PATCH|DELETE /cart/bundles` — bundle cart lines.
- `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`.
- `GET /reports/summary`, `/reports/sales.csv`, `/reports/services.csv` — Admin only.
- `POST /solutions`, `GET /solutions`, `PATCH /solutions/:id/quote`, `POST /solutions/:id/decision`.
- `PATCH /users/:userId/business-account` — Admin-controlled account type and discount basis points.
- `POST /search/assist` — optional AI term expansion with standard-search fallback.

Quote and bundle acceptance expands product components for inventory and verified-purchase history. Included services create requested service bookings. These writes and the order are committed in one MongoDB transaction.

