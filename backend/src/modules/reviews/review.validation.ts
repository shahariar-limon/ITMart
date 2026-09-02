import { z } from "zod";
export const reviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    text: z.string().trim().min(2).max(2000),
  })
  .strict();
