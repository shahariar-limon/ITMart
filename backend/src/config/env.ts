import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z
    .string()
    .min(32)
    .default("development-only-secret-change-me-123456"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  AI_API_URL: z.string().url().optional().or(z.literal("")),
  AI_API_KEY: z.string().optional(),
  PAYMENT_PROVIDER: z.enum(["cod", "simulated"]).default("cod"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  throw new Error(`Invalid environment configuration: ${result.error.message}`);
}

export const env = result.data;
