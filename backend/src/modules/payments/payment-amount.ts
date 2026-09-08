// Application amounts are integer paisa; bKash API amounts are decimal taka.
export function toBkashAmount(paisa: number): string {
  if (!Number.isSafeInteger(paisa) || paisa <= 0) {
    throw new Error("Payment amount must be a positive integer in paisa");
  }
  return `${Math.floor(paisa / 100)}.${String(paisa % 100).padStart(2, "0")}`;
}

export function fromBkashAmount(amount: unknown): number | null {
  if (typeof amount !== "string" && typeof amount !== "number") return null;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(amount));
  if (!match) return null;
  const paisa =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(paisa) && paisa > 0 ? paisa : null;
}
