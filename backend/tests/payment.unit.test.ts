import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/config/env.js", () => ({
  env: {
    PAYMENT_PROVIDER: "bkash",
    BKASH_BASE_URL: "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
    BKASH_APP_KEY: "test-key",
    BKASH_APP_SECRET: "test-secret",
    BKASH_USERNAME: "test-user",
    BKASH_PASSWORD: "test-password",
    BKASH_CALLBACK_URL: "https://example.com/api/v1/payments/bkash/callback",
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function paymentRequest(response: object) {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ id_token: "test-token", statusCode: "0000" }),
    )
    .mockResolvedValueOnce(Response.json(response));
  vi.stubGlobal("fetch", fetchMock);
  const { createBkashPayment } =
    await import("../src/modules/payments/payment.service.js");
  return createBkashPayment({
    amount: 10,
    invoiceNumber: "TEST-1",
    payerReference: "customer",
  });
}

describe("bKash response handling", () => {
  it("identifies callback rejection even when HTTP status is 200", async () => {
    await expect(
      paymentRequest({
        statusCode: "2049",
        statusMessage: "Invalid Merchant Callback URL",
      }),
    ).rejects.toMatchObject({
      code: "BKASH_API_ERROR",
      details: { providerCode: "2049" },
      message: expect.stringContaining("BKASH_CALLBACK_URL"),
    });
  });

  it("preserves other provider failures instead of reporting a missing URL", async () => {
    await expect(
      paymentRequest({ statusCode: "2062", statusMessage: "Payment rejected" }),
    ).rejects.toMatchObject({
      code: "BKASH_API_ERROR",
      message: "Payment rejected",
      details: { providerCode: "2062" },
    });
  });

  it("returns the checkout URL on success", async () => {
    await expect(
      paymentRequest({
        statusCode: "0000",
        paymentID: "payment-1",
        bkashURL: "https://sandbox.bka.sh/checkout",
      }),
    ).resolves.toMatchObject({
      paymentId: "payment-1",
      paymentUrl: "https://sandbox.bka.sh/checkout",
    });
  });

  it("rejects a malformed successful response", async () => {
    await expect(paymentRequest({ statusCode: "0000" })).rejects.toMatchObject({
      code: "BKASH_INVALID_RESPONSE",
    });
  });
});
