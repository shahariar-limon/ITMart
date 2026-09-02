import { useState, type FormEvent } from "react";
import { apiClient } from "../../api/client";
import { apiError, Notice } from "../commerce/ui";
export function BusinessAccountsPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await apiClient.patch(
        `/users/${String(data.get("userId"))}/business-account`,
        {
          accountType: String(data.get("accountType")),
          businessDiscountBps: Number(data.get("discount")),
        },
      );
      setMessage("Customer account updated.");
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-black">Business accounts</h1>
      {error && <Notice message={error} />}
      {message && <Notice message={message} tone="success" />}
      <form
        onSubmit={submit}
        className="mt-8 grid gap-3 rounded-2xl bg-white p-6"
      >
        <input
          required
          name="userId"
          pattern="[a-fA-F0-9]{24}"
          placeholder="Customer user ID"
          className="rounded-xl border p-3"
        />
        <select name="accountType" className="rounded-xl border p-3">
          <option value="business">Business</option>
          <option value="personal">Personal</option>
        </select>
        <input
          required
          name="discount"
          type="number"
          min="0"
          max="5000"
          placeholder="Discount basis points (500 = 5%)"
          className="rounded-xl border p-3"
        />
        <button className="w-fit rounded-xl bg-brand px-5 py-3 font-semibold text-white">
          Update account
        </button>
      </form>
    </main>
  );
}
