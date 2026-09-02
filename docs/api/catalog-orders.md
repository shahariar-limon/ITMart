# Catalog, Cart, and Orders API

Base URL: `/api/v1`. Prices are integer minor units; `10000` represents BDT 100.00.

## Catalog

- `GET /categories` — active categories.
- `POST /categories` — Admin only.
- `PATCH /categories/:categoryId` — Admin only.
- `GET /products` — active products with `q`, `category`, `brand`, `minPrice`, `maxPrice`, `available`, `sort`, `page`, and `limit` query parameters.
- `GET /products/:productId` — active product detail.
- `POST /products` — Admin only.
- `PATCH /products/:productId` — Admin only.
- `DELETE /products/:productId` — Admin-only archive operation; returns `204`.

Lists default to 20 items and never accept more than 100. Public reads never expose archived products.

## Cart

All cart endpoints require a Customer access token.

- `GET /cart`
- `POST /cart/items` with `{ "productId": "...", "quantity": 1 }`
- `PATCH /cart/items/:productId` with `{ "quantity": 2 }`
- `DELETE /cart/items/:productId`

Cart prices are estimates. The server re-reads product status, price, discount, and stock during checkout.

## Orders

- `POST /orders` — Customer checkout from the current cart.
- `GET /orders` — Customer's own orders or all orders for Admin.
- `GET /orders/:orderId` — owner or Admin.
- `PATCH /orders/:orderId/status` — Admin only.
- `POST /orders/:orderId/cancel` — eligible owner or Admin.

Checkout request:

```json
{
  "shippingAddress": "12 Example Road, Dhaka",
  "paymentMethod": "cod"
}
```

Client totals and prices are discarded. Checkout conditionally decrements each item's stock and creates the order in one MongoDB transaction. A stale or unavailable cart returns `409 STOCK_CONFLICT` and leaves no partial changes.

Valid order progression is:

```text
Pending → Confirmed → Processing → Shipped → Delivered → Completed
Pending or Confirmed → Cancelled
```

Cancellation restores inventory once within a transaction. Invalid and repeated transitions return `409`.

