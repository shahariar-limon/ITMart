import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { apiError, Loading, money, Notice } from "../commerce/ui";
import { getDashboard } from "./release-api";
import type { DashboardData } from "./types";

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (user?.role === "admin")
      getDashboard()
        .then(setData)
        .catch((caught) => setError(apiError(caught)));
  }, [user?.role]);
  if (user?.role !== "admin")
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <p className="font-semibold uppercase tracking-widest text-brand">
          {user?.role} workspace
        </p>
        <h1 className="mt-2 text-4xl font-black">Welcome, {user?.name}</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            to={user?.role === "technician" ? "/bookings" : "/orders"}
            className="rounded-2xl bg-white p-6 text-xl font-bold shadow-sm"
          >
            {user?.role === "technician"
              ? "Assigned service work"
              : "Your orders"}
          </Link>
          <Link
            to="/services"
            className="rounded-2xl bg-white p-6 text-xl font-bold shadow-sm"
          >
            Technical services
          </Link>
        </div>
      </main>
    );
  if (error)
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <Notice message={error} />
      </main>
    );
  if (!data) return <Loading />;
  const cards = [
    ["Active products", data.metrics.activeProducts],
    ["Customers", data.metrics.customers],
    ["Orders", data.metrics.totalOrders],
    ["Pending orders", data.metrics.pendingOrders],
    ["Active bookings", data.metrics.activeBookings],
    ["Revenue", money(data.metrics.revenue)],
  ];
  const max = Math.max(1, ...data.ordersByStatus.map((item) => item.count));
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="font-semibold uppercase tracking-widest text-brand">
        Administration · UTC metrics
      </p>
      <h1 className="mt-2 text-4xl font-black">Operations dashboard</h1>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <article
            key={String(label)}
            className="rounded-2xl bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </article>
        ))}
      </section>
      <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Orders by status</h2>
        <div className="mt-5 space-y-3">
          {data.ordersByStatus.map((item) => (
            <div
              key={item.status}
              className="grid grid-cols-[100px_1fr_40px] items-center gap-3 text-sm"
            >
              <span className="capitalize">{item.status}</span>
              <div className="h-3 overflow-hidden rounded bg-slate-100">
                <div
                  className="h-full rounded bg-brand"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
