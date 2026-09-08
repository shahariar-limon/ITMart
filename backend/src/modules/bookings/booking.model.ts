export const BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "assigned",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];