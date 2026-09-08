import { PrismaClient } from "../generated/prisma-client/index.js";
import { env } from "./env.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    transactionOptions: { maxWait: env.PRISMA_TRANSACTION_MAX_WAIT_MS, timeout: env.PRISMA_TRANSACTION_TIMEOUT_MS },
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
