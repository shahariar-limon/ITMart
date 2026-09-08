import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { paymentRouter } from "../src/modules/payments/payment.routes.js";
import { errorHandler } from "../src/middleware/error-handler.js";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateAttempt: vi.fn(),
  updateOrder: vi.fn(),
  transaction: vi.fn(),
  execute: vi.fn(),
}));
vi.mock("../src/config/env.js", () => ({
  env: { NODE_ENV: "test", CORS_ORIGIN: "https://example.test" },
}));
vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    paymentAttempt: {
      findUnique: mocks.findUnique,
      update: mocks.updateAttempt,
    },
    order: { update: mocks.updateOrder },
    $transaction: mocks.transaction,
  },
}));
vi.mock("../src/modules/payments/payment.service.js", () => ({
  executeBkashPayment: mocks.execute,
}));
vi.mock("../src/modules/orders/order.service.js", () => ({ cancel: vi.fn() }));
const app = express();
app.use("/api/v1/payments", paymentRouter);
app.use(errorHandler);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.findUnique.mockResolvedValue({
    id: "attempt-1",
    orderId: "order-1",
    provider: "bkash",
    status: "unpaid",
    amount: 285000,
    order: { orderNumber: "ITM-1" },
  });
  mocks.execute.mockResolvedValue({
    transactionStatus: "Completed",
    paymentID: "payment-1",
    merchantInvoiceNumber: "ITM-1",
    amount: "2850.00",
    trxID: "transaction-1",
  });
  mocks.updateAttempt.mockResolvedValue({});
  mocks.updateOrder.mockResolvedValue({});
  mocks.transaction.mockResolvedValue([]);
});
describe("bKash callback amount verification", () => {
  it("marks the order paid when verified taka equals stored paisa", async () => {
    const result = await request(app).get(
      "/api/v1/payments/bkash/callback?paymentID=payment-1&status=success",
    );
    expect(result.status).toBe(303);
    expect(result.headers.location).toContain("payment=success");
    expect(mocks.updateOrder).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { paymentStatus: "paid", paymentReference: "transaction-1" },
    });
  });
  it.each(["285000.00", "28.50", "2850.001", null])(
    "rejects mismatched or malformed amount %s",
    async (amount) => {
      mocks.execute.mockResolvedValue({
        transactionStatus: "Completed",
        paymentID: "payment-1",
        merchantInvoiceNumber: "ITM-1",
        amount,
      });
      const result = await request(app).get(
        "/api/v1/payments/bkash/callback?paymentID=payment-1&status=success",
      );
      expect(result.status).toBe(502);
      expect(result.body.error.code).toBe("BKASH_VERIFICATION_FAILED");
      expect(mocks.updateOrder).not.toHaveBeenCalled();
    },
  );
});
