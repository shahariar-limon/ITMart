import { Prisma } from "../../src/generated/prisma-client/index.js";
import { prisma } from "../../src/config/prisma.js";

const TABLES = [
  "SupportReply",
  "SupportTicket",
  "OutboxMessage",
  "AuditLog",
  "ReturnRequest",
  "PaymentAttempt",
  "OrderStatusHistory",
  "OrderBundleService",
  "OrderBundleItem",
  "OrderItem",
  "Order",
  "BookingStatusHistory",
  "ServiceBooking",
  "SolutionQuoteService",
  "SolutionQuoteProduct",
  "SolutionRequest",
  "Notification",
  "WishlistProduct",
  "Wishlist",
  "Review",
  "CartBundleItem",
  "CartItem",
  "Cart",
  "BundleProduct",
  "BundleService",
  "Bundle",
  "Service",
  "Product",
  "Category",
  "User",
];

function isTransient(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P1001", "P1002", "P1017"].includes(error.code))
  );
}

export async function resetDb(): Promise<void> {
  const quoted = TABLES.map((table) => `"${table}"`).join(", ");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`,
      );
      return;
    } catch (error) {
      if (attempt === 3 || !isTransient(error)) throw error;
      await prisma.$connect().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}