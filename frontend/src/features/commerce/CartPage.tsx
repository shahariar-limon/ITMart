import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkout,
  getCart,
  removeCartItem,
  removeBundleCartItem,
  updateCartItem,
  updateBundleCartItem,
} from "./commerce-api";
import type { Cart } from "./types";
import { apiError, Loading, money, Notice } from "./ui";

export function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function load() {
    try {
      setCart(await getCart());
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function change(productId: string, quantity: number) {
    try {
      setCart(await updateCartItem(productId, quantity));
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function remove(productId: string) {
    try {
      await removeCartItem(productId);
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function changeBundle(bundleId: string, quantity: number) {
    try {
      setCart(await updateBundleCartItem(bundleId, quantity));
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function removeBundle(bundleId: string) {
    try {
      await removeBundleCartItem(bundleId);
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      const order = await checkout(
        String(data.get("shippingAddress")),
        String(data.get("paymentMethod")) as "cod" | "simulated",
      );
      navigate(`/orders?placed=${order.orderNumber}`);
    } catch (caught) {
      setError(apiError(caught));
      await load();
    } finally {
      setBusy(false);
    }
  }
  if (!cart)
    return error ? (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <Notice message={error} />
      </main>
    ) : (
      <Loading />
    );
  const total =
    cart.items.reduce(
      (sum, item) =>
        sum + (item.productId.price - item.productId.discount) * item.quantity,
      0,
    ) +
    cart.bundleItems.reduce(
      (sum, item) => sum + item.bundleId.bundlePrice * item.quantity,
      0,
    );
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-4xl font-black">Your cart</h1>
      {error && (
        <div className="mt-5">
          <Notice message={error} />
        </div>
      )}
      {cart.items.length === 0 && cart.bundleItems.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-white p-8 text-slate-500">
          Your cart is empty.
        </p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <section className="space-y-4">
            {cart.items.map((item) => (
              <article
                key={item.productId._id}
                className="flex items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm"
              >
                <div>
                  <h2 className="font-bold">{item.productId.name}</h2>
                  <p className="text-sm text-slate-500">
                    {money(item.productId.price - item.productId.discount)} each
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    aria-label={`Quantity for ${item.productId.name}`}
                    type="number"
                    min="1"
                    max="99"
                    value={item.quantity}
                    onChange={(event) =>
                      void change(
                        item.productId._id,
                        Number(event.target.value),
                      )
                    }
                    className="w-16 rounded-lg border p-2"
                  />
                  <button
                    onClick={() => void remove(item.productId._id)}
                    className="text-sm font-semibold text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
            {cart.bundleItems.map((item) => (
              <article
                key={item.bundleId._id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
              >
                <div>
                  <p className="text-xs font-semibold uppercase text-brand">
                    Solution bundle
                  </p>
                  <h2 className="font-bold">{item.bundleId.name}</h2>
                  <p className="text-sm text-slate-500">
                    {money(item.bundleId.bundlePrice)} each
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    aria-label={`Quantity for ${item.bundleId.name}`}
                    type="number"
                    min="1"
                    max="20"
                    value={item.quantity}
                    onChange={(event) =>
                      void changeBundle(
                        item.bundleId._id,
                        Number(event.target.value),
                      )
                    }
                    className="w-16 rounded-lg border p-2"
                  />
                  <button
                    onClick={() => void removeBundle(item.bundleId._id)}
                    className="text-sm font-semibold text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </section>
          <form
            onSubmit={submit}
            className="h-fit rounded-2xl bg-ink p-6 text-white"
          >
            <h2 className="text-2xl font-bold">Checkout</h2>
            <div className="mt-4 flex justify-between">
              <span>Estimated total</span>
              <strong>{money(total)}</strong>
            </div>
            <label className="mt-6 block text-sm font-medium">
              Shipping address
              <textarea
                name="shippingAddress"
                required
                minLength={10}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-white"
              />
            </label>
            <p className="mt-3 text-xs text-slate-400">
              Payment method: Cash on delivery. Final price and stock are
              verified when you place the order.
            </p>
            <label className="mt-4 block text-sm font-medium">
              Payment method
              <select
                name="paymentMethod"
                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 p-3"
              >
                <option value="cod">Cash on delivery</option>
                <option value="simulated">
                  Simulated sandbox authorization
                </option>
              </select>
            </label>
            <button
              disabled={busy}
              className="mt-5 w-full rounded-xl bg-brand px-4 py-3 font-semibold disabled:opacity-50"
            >
              {busy ? "Placing order…" : "Place order"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
