import { z } from "zod";
import { objectIdSchema } from "../../shared/object-id.js";

export const addCartItemSchema = z
  .object({
    productId: objectIdSchema,
    quantity: z.number().int().min(1).max(99),
  })
  .strict();
export const updateCartItemSchema = z
  .object({ quantity: z.number().int().min(1).max(99) })
  .strict();
export const addBundleItemSchema = z
  .object({
    bundleId: objectIdSchema,
    quantity: z.number().int().min(1).max(20),
  })
  .strict();
