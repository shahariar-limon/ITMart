import { describe, expect, it } from "vitest";
import {
  fromBkashAmount,
  toBkashAmount,
} from "../src/modules/payments/payment-amount.js";

describe("bKash monetary units", () => {
  it.each([
    [285000, "2850.00"],
    [293000, "2930.00"],
    [303000, "3030.00"],
    [285080, "2850.80"],
    [29, "0.29"],
  ])("formats %s paisa as %s taka", (paisa, taka) => {
    expect(toBkashAmount(paisa as number)).toBe(taka);
    expect(fromBkashAmount(taka)).toBe(paisa);
  });
  it.each([
    null,
    undefined,
    true,
    "",
    "NaN",
    "Infinity",
    "-1",
    "0",
    "0.001",
    "1e3",
    "1.234",
    {},
  ])("rejects malformed provider amount %s", (amount) => {
    expect(fromBkashAmount(amount)).toBeNull();
  });
  it("accepts a numeric taka response without floating-point comparison errors", () => {
    expect(fromBkashAmount(0.29)).toBe(29);
    expect(fromBkashAmount("2850")).toBe(285000);
  });
});
