import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  TEST_DATABASE_URL: z.string().optional(),
  PRISMA_TRANSACTION_MAX_WAIT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  PRISMA_TRANSACTION_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(30000),
  JWT_SECRET: z
    .string()
    .min(32)
    .default("development-only-secret-change-me-123456"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  PAYMENT_PROVIDER: z.enum(["cod", "simulated", "bkash"]).default("cod"),
  BKASH_BASE_URL: z.string().url().default("https://tokenized.sandbox.bka.sh/v1.2.0-beta"),
  BKASH_APP_KEY: z.string().optional(),
  BKASH_APP_SECRET: z.string().optional(),
  BKASH_USERNAME: z.string().optional(),
  BKASH_PASSWORD: z.string().optional(),
  BKASH_CALLBACK_URL: z.string().url().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  throw new Error(`Invalid environment configuration: ${result.error.message}`);
}

export const env = result.data;
