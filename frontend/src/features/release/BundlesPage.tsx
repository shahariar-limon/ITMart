import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { apiError, Loading, money, Notice } from "../commerce/ui";
import { addBundleToCart, getBundles } from "./release-api";
import type { Bundle } from "./types";
export function BundlesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<Bundle[] | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    getBundles()
      .then(setBundles)
      .catch((caught) => setError(apiError(caught)));
  }, []);
  async function add(id: string) {
    if (!user) {
      navigate("/login", { state: { from: "/bundles" } });
      return;
    }
    try {
      await addBundleToCart(id);
      setMessage("Bundle added to your cart.");
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  if (!bundles)
    return error ? (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <Notice message={error} />
      </main>
    ) : (
      <Loading />
    );
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="font-semibold uppercase tracking-widest text-brand">
        Complete solutions
      </p>
      <h1 className="mt-2 text-4xl font-black">Solution bundles</h1>
      {message && (
        <div className="mt-5">
          <Notice message={message} tone="success" />
        </div>
      )}
      {error && (
        <div className="mt-5">
          <Notice message={error} />
        </div>
      )}
      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {bundles.length === 0 ? (
          <p className="text-slate-500">No bundles are available.</p>
        ) : (
          bundles.map((bundle) => (
            <article
              key={bundle._id}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <h2 className="text-2xl font-bold">{bundle.name}</h2>
              <p className="mt-2 text-slate-600">{bundle.description}</p>
              <p className="mt-5 text-2xl font-black">
                {money(bundle.bundlePrice)}
              </p>
              <h3 className="mt-5 font-bold">Includes</h3>
              <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
                {bundle.productItems.map((item) => (
                  <li key={item.productId._id}>
                    {item.quantity} × {item.productId.name}
                  </li>
                ))}
                {bundle.serviceIds.map((service) => (
                  <li key={service._id}>{service.name}</li>
                ))}
              </ul>
              {user?.role === "customer" || !user ? (
                <button
                  onClick={() => void add(bundle._id)}
                  className="mt-6 rounded-xl bg-brand px-5 py-3 font-semibold text-white"
                >
                  Add bundle to cart
                </button>
              ) : null}
            </article>
          ))
        )}
      </section>
    </main>
  );
}
