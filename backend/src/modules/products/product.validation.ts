import { z } from "zod";
import { objectIdSchema } from "../../shared/object-id.js";

const productFields = {
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().toUpperCase().min(1).max(64),
  categoryId: objectIdSchema,
  brand: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(5000),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  imageUrls: z.array(z.string().url()).max(10).default([]),
  price: z.number().int().nonnegative().max(1_000_000_000),
  discount: z.number().int().nonnegative().max(1_000_000_000).default(0),
  stock: z.number().int().nonnegative().max(1_000_000),
  specs: z.record(z.string().min(1).max(80), z.string().max(500)).default({}),
  warranty: z.string().trim().max(200).default(""),
  status: z.enum(["active", "archived"] as const).default("active"),
};

export const createProductSchema = z
  .object(productFields)
  .strict()
  .refine((data) => data.discount <= data.price, {
    message: "Discount cannot exceed price",
    path: ["discount"],
  });
export const updateProductSchema = z
  .object({
    ...productFields,
    tags: productFields.tags.removeDefault(),
    imageUrls: productFields.imageUrls.removeDefault(),
    discount: productFields.discount.removeDefault(),
    specs: productFields.specs.removeDefault(),
    warranty: productFields.warranty.removeDefault(),
    status: productFields.status.removeDefault(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const productListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: objectIdSchema.optional(),
  brand: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  available: z.enum(["true", "false"]).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
