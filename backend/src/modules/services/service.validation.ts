import { z } from "zod";
import { PRICE_MODELS } from "./service.model.js";

const fields = {
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(1).max(5000),
  priceModel: z.enum(PRICE_MODELS),
  basePrice: z.number().int().nonnegative().max(1_000_000_000),
  durationMinutes: z.number().int().min(15).max(1440),
  isActive: z.boolean().default(true),
};

export const createServiceSchema = z.object(fields).strict();
export const updateServiceSchema = z
  .object({ ...fields, isActive: fields.isActive.removeDefault() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);
