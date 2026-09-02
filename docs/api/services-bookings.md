# Services and Bookings API

Base URL: `/api/v1`. Monetary values use integer minor units and timestamps use ISO 8601 UTC.

## Services

- `GET /services` — list active services.
- `GET /services/:serviceId` — active service details.
- `POST /services` — Admin only.
- `PATCH /services/:serviceId` — Admin only; setting `isActive` to `false` removes it from public discovery.

A service records its pricing model (`fixed`, `starting_at`, or `quote`), base price, and estimated duration.

## Bookings

- `POST /bookings` — Customer creates a request.
- `GET /bookings` — role-scoped list: own for Customer, assigned for Technician, all for Admin.
- `GET /bookings/:bookingId` — same ownership/assignment scope.
- `PATCH /bookings/:bookingId/assignment` — Admin assigns an active Technician.
- `PATCH /bookings/:bookingId/schedule` — Admin schedules or reschedules assigned work.
- `PATCH /bookings/:bookingId/status` — Admin or assigned Technician, subject to transition policy.
- `POST /bookings/:bookingId/cancel` — eligible owner or Admin.
- `GET /users/technicians` — Admin-only assignment list.

Creation request:

```json
{
  "serviceId": "68b000000000000000000001",
  "preferredStart": "2026-09-10T04:00:00.000Z",
  "address": "12 Example Road, Dhaka",
  "customerNotes": "Call before arrival"
}
```

Lifecycle:

```text
Requested → Confirmed → Assigned → Scheduled → In Progress → Completed
Requested, Confirmed, Assigned, or Scheduled → Cancelled
```

The Admin controls confirmation, assignment, and scheduling. The assigned Technician may move `Scheduled → In Progress → Completed` and may attach notes. Completed and Cancelled are terminal.

Scheduling acquires a transactional write lock on the Technician before checking interval overlap. An existing active booking conflicts when its start is before the proposed end and its end is after the proposed start. Conflicts return `409 TECHNICIAN_UNAVAILABLE`.

