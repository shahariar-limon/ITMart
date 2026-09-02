import { z } from "zod";
import { ORDER_STATUSES } from "./order.model.js";

export const checkoutSchema = z
  .object({
    shippingAddress: z.string().trim().min(10).max(500),
    paymentMethod: z.enum(["cod", "simulated"]).default("cod"),
  })
  .strip();
export const updateOrderStatusSchema = z
  .object({ status: z.enum(ORDER_STATUSES) })
  .strict();
export const orderListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ORDER_STATUSES).optional(),
});
