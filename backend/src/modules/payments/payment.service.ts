import { randomUUID } from "node:crypto";
export type PaymentMethod = "cod" | "simulated";
export async function authorizePayment(method: PaymentMethod, amount: number) {
  if (method === "cod") return { status: "unpaid" as const };
  if (amount < 0) throw new Error("Invalid payment amount");
  return { status: "authorized" as const, reference: `SIM-${randomUUID()}` };
}
