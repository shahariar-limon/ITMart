import { z } from "zod";

const categoryFields = {
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  description: z.string().trim().max(500).default(""),
};

export const createCategorySchema = z.object(categoryFields).strict();
export const updateCategorySchema = z
  .object({
    ...categoryFields,
    description: categoryFields.description.removeDefault(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);
