import { z } from "zod";
import { objectIdSchema } from "../../shared/object-id.js";
const fields = {
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(1).max(3000),
  productItems: z
    .array(
      z
        .object({
          productId: objectIdSchema,
          quantity: z.number().int().min(1).max(99),
        })
        .strict(),
    )
    .max(30)
    .default([]),
  serviceIds: z.array(objectIdSchema).max(20).default([]),
  bundlePrice: z.number().int().nonnegative().max(1_000_000_000),
  isActive: z.boolean().default(true),
};
const hasComponent = (value: {
  productItems?: unknown[];
  serviceIds?: unknown[];
}) => (value.productItems?.length ?? 0) + (value.serviceIds?.length ?? 0) > 0;
export const createBundleSchema = z
  .object(fields)
  .strict()
  .refine(hasComponent, "Bundle requires at least one component");
export const updateBundleSchema = z
  .object({
    ...fields,
    productItems: fields.productItems.removeDefault(),
    serviceIds: fields.serviceIds.removeDefault(),
    isActive: fields.isActive.removeDefault(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);
