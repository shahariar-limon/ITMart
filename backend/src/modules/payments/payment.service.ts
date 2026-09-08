import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/app-error.js";

export type PaymentMethod = "cod" | "simulated";
export async function authorizePayment(method: PaymentMethod, amount: number) {
  if (method === "cod") return { status: "unpaid" as const, reference: null };
  if (amount < 0) throw new Error("Invalid payment amount");
  return { status: "authorized" as const, reference: `SIM-${randomUUID()}` };
}

type BkashResponse = Record<string, unknown> & {
  statusCode?: string;
  statusMessage?: string;
  errorCode?: string;
  errorMessage?: string;
};

let cachedToken: { value: string; expiresAt: number } | undefined;

function configuration() {
  if (env.PAYMENT_PROVIDER !== "bkash")
    throw new AppError(
      503,
      "BKASH_NOT_ENABLED",
      "Set PAYMENT_PROVIDER=bkash to enable bKash checkout",
    );
  const required = {
    appKey: env.BKASH_APP_KEY,
    appSecret: env.BKASH_APP_SECRET,
    username: env.BKASH_USERNAME,
    password: env.BKASH_PASSWORD,
    callbackUrl: env.BKASH_CALLBACK_URL,
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length)
    throw new AppError(
      503,
      "BKASH_NOT_CONFIGURED",
      "bKash sandbox is not configured on the server",
      { missing },
    );
  return required as Record<keyof typeof required, string>;
}

async function request(path: string, body: object, token?: string) {
  const config = configuration();
  let response: Response;
  try {
    response = await fetch(`${env.BKASH_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        username: config.username,
        password: config.password,
        ...(token
          ? { Authorization: token, "X-App-Key": config.appKey }
          : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new AppError(502, "BKASH_UNAVAILABLE", "Could not reach bKash", {
      cause: error instanceof Error ? error.message : "Network request failed",
    });
  }
  const data = (await response.json().catch(() => ({}))) as BkashResponse;
  if (!response.ok || data.errorCode)
    throw new AppError(
      502,
      "BKASH_API_ERROR",
      data.errorMessage ?? data.statusMessage ?? "bKash rejected the request",
      { providerCode: data.errorCode ?? data.statusCode },
    );
  return data;
}

async function grantToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000)
    return cachedToken.value;
  const config = configuration();
  const data = await request("/tokenized/checkout/token/grant", {
    app_key: config.appKey,
    app_secret: config.appSecret,
  });
  const token = data.id_token;
  if (typeof token !== "string")
    throw new AppError(502, "BKASH_INVALID_RESPONSE", "bKash did not return an access token");
  const expiresIn = Number(data.expires_in ?? 3600);
  cachedToken = { value: token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

export async function createBkashPayment(input: {
  amount: number;
  invoiceNumber: string;
  payerReference: string;
}) {
  const config = configuration();
  const token = await grantToken();
  const data = await request(
    "/tokenized/checkout/create",
    {
      mode: "0011",
      payerReference: input.payerReference,
      callbackURL: config.callbackUrl,
      amount: input.amount.toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: input.invoiceNumber,
    },
    token,
  );
  if (typeof data.paymentID !== "string" || typeof data.bkashURL !== "string")
    throw new AppError(502, "BKASH_INVALID_RESPONSE", "bKash did not return a checkout URL");
  return { paymentId: data.paymentID, paymentUrl: data.bkashURL, raw: data };
}

export async function executeBkashPayment(paymentId: string) {
  const token = await grantToken();
  const data = await request(
    "/tokenized/checkout/execute",
    { paymentID: paymentId },
    token,
  );
  return data;
}
