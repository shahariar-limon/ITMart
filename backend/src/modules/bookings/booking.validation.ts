import { z } from "zod";
import { objectIdSchema } from "../../shared/object-id.js";
import { BOOKING_STATUSES } from "./booking.model.js";

const futureDate = z.coerce.date();

export const createBookingSchema = z
  .object({
    serviceId: objectIdSchema,
    preferredStart: futureDate.optional(),
    address: z.string().trim().min(10).max(500),
    customerNotes: z.string().trim().max(2000).default(""),
  })
  .strict();
export const assignBookingSchema = z
  .object({ technicianId: objectIdSchema })
  .strict();
export const scheduleBookingSchema = z
  .object({ scheduledStart: futureDate })
  .strict();
export const updateBookingStatusSchema = z
  .object({
    status: z.enum(BOOKING_STATUSES),
    technicianNotes: z.string().trim().max(2000).optional(),
  })
  .strict();
export const bookingListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(BOOKING_STATUSES).optional(),
});
