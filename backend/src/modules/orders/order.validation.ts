import { z } from "zod";
import { ORDER_STATUSES } from "./order.model.js";

export const checkoutSchema = z
  .object({
    shippingAddress: z.string().trim().min(10).max(500),
    paymentMethod: z.enum(["cod", "simulated", "bkash"]).default("cod"),
    deliveryMethod: z
      .enum(["standard", "express", "pickup"])
      .default("standard"),
    idempotencyKey: z.string().uuid(),
  })
  .strip();
export const updateOrderStatusSchema = z
  .object({
    status: z.enum(ORDER_STATUSES),
    carrier: z.string().trim().max(100).default(""),
    trackingNumber: z.string().trim().max(100).default(""),
    trackingUrl: z
      .union([z.string().url().max(500), z.literal("")])
      .default(""),
    fulfilmentNotes: z.string().trim().max(1000).default(""),
  })
  .strict();
export const cancelOrderSchema = z
  .object({
    reason: z.string().trim().min(3).max(500).default("Cancelled by user"),
  })
  .strip();
export const returnRequestSchema = z
  .object({ reason: z.string().trim().min(10).max(1000) })
  .strict();
export const orderListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ORDER_STATUSES).optional(),
});
