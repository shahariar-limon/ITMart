import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  cancelOrder,
  downloadInvoice,
  getOrders,
  requestReturn,
  updateOrderStatus,
} from "./commerce-api";
import type { Order, OrderStatus } from "./types";
import { apiError, Loading, money, Notice } from "./ui";
import { useAuth } from "../auth/auth-context";

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "shipped",
  shipped: "delivered",
  delivered: "completed",
};
export function OrdersPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  async function load() {
    try {
      setOrders(await getOrders());
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function cancel(id: string) {
    try {
      await cancelOrder(id);
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function advance(order: Order) {
    const status = NEXT[order.status];
    if (!status) return;
    try {
      const trackingNumber =
        status === "shipped"
          ? (window.prompt("Tracking number (required)") ?? "")
          : "";
      if (status === "shipped" && !trackingNumber) return;
      const carrier =
        status === "shipped" ? (window.prompt("Carrier name") ?? "") : "";
      await updateOrderStatus(order._id, status, { trackingNumber, carrier });
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function startReturn(order: Order) {
    const reason = window.prompt("Tell us why you want to return this order");
    if (!reason) return;
    try {
      await requestReturn(order._id, reason);
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  if (!orders)
    return error ? (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Notice message={error} />
      </main>
    ) : (
      <Loading />
    );
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <p className="font-semibold uppercase tracking-widest text-brand">
        {user?.role === "admin" ? "Order management" : "Order history"}
      </p>
      <h1 className="mt-2 text-4xl font-black">Orders</h1>
      {params.get("placed") && (
        <div className="mt-5">
          <Notice
            message={`Order ${params.get("placed")} was placed successfully.`}
            tone="success"
          />
        </div>
      )}
      {error && (
        <div className="mt-5">
          <Notice message={error} />
        </div>
      )}
      <section className="mt-8 space-y-5">
        {orders.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-slate-500">
            No orders yet.
          </p>
        ) : (
          orders.map((order) => (
            <article
              key={order._id}
              className="commerce-card rounded-2xl border bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{order.orderNumber}</p>
                  <h2 className="mt-1 text-xl font-bold capitalize">
                    {order.status}
                  </h2>
                </div>
                <p className="text-xl font-black">{money(order.grandTotal)}</p>
              </div>
              <ul className="mt-4 space-y-1 text-sm text-slate-600">
                {order.items.map((item) => (
                  <li key={item.productId}>
                    {item.quantity} × {item.nameSnapshot} —{" "}
                    {money(item.lineTotal)}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-slate-500">
                Deliver to: {order.shippingAddress}
              </p>
              <div className="mt-5 border-l-2 border-emerald-100 pl-5">
                {order.statusHistory.map((event) => (
                  <div key={event.id} className="relative pb-4 last:pb-0">
                    <span className="status-dot absolute -left-[1.44rem] top-1 h-2.5 w-2.5 rounded-full bg-brand" />
                    <p className="text-sm font-bold capitalize">
                      {event.to.replace("_", " ")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(event.changedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              {order.trackingNumber && (
                <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm">
                  <strong>{order.carrier || "Carrier"}</strong> ·{" "}
                  {order.trackingNumber}
                  {order.trackingUrl && (
                    <a
                      className="ml-2 font-bold text-brand"
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Track
                    </a>
                  )}
                </div>
              )}
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {order.deliveryMethod} delivery · {order.paymentStatus} ·{" "}
                {order.paymentMethod}
              </p>
              <div className="mt-4 flex gap-3">
                {["pending", "confirmed"].includes(order.status) && (
                  <button
                    onClick={() => void cancel(order._id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                  >
                    Cancel order
                  </button>
                )}
                {user?.role === "admin" && NEXT[order.status] && (
                  <button
                    onClick={() => void advance(order)}
                    className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white"
                  >
                    Move to {NEXT[order.status]}
                  </button>
                )}
                <button
                  onClick={() =>
                    void downloadInvoice(order._id, order.orderNumber)
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                >
                  Invoice
                </button>
                {user?.role === "customer" &&
                  ["delivered", "completed"].includes(order.status) &&
                  order.returnRequests.length === 0 && (
                    <button
                      onClick={() => void startReturn(order)}
                      className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-800"
                    >
                      Request return
                    </button>
                  )}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
