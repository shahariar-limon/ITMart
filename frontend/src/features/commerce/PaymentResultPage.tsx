import { Link, useSearchParams } from "react-router-dom";

export function PaymentResultPage() {
  const [params] = useSearchParams();
  const status = params.get("payment") ?? "failure";
  const orderNumber = params.get("order");
  const success = status === "success";
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="commerce-card rounded-3xl border bg-white p-10 shadow-sm">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-2xl font-black ${success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
          {success ? "✓" : "!"}
        </div>
        <h1 className="mt-6 text-3xl font-black">
          {success ? "Payment successful" : status === "cancel" ? "Payment cancelled" : "Payment failed"}
        </h1>
        {orderNumber && <p className="mt-3 text-slate-500">Order {orderNumber}</p>}
        <p className="mt-3 text-sm text-slate-500">
          {success
            ? "Your bKash sandbox payment was verified by the server."
            : "No successful bKash payment was recorded. You can return to the store and try again."}
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link to="/orders" className="rounded-xl bg-brand px-5 py-3 font-bold text-white">View orders</Link>
          <Link to="/products" className="rounded-xl border px-5 py-3 font-bold">Continue shopping</Link>
        </div>
      </div>
    </main>
  );
}
