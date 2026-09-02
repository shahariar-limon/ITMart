import { useEffect, useState, type FormEvent } from "react";
import { getProducts } from "../commerce/commerce-api";
import type { Product } from "../commerce/types";
import { apiError, money, Notice } from "../commerce/ui";
import { getServices } from "../services/services-api";
import type { Service } from "../services/types";
import { createBundle, getBundles } from "./release-api";
import type { Bundle } from "./types";
export function AdminBundlesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    try {
      const [productResult, serviceResult, bundleResult] = await Promise.all([
        getProducts({ limit: 100 }),
        getServices(),
        getBundles(),
      ]);
      setProducts(productResult.data.products);
      setServices(serviceResult);
      setBundles(bundleResult);
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const productId = String(data.get("productId"));
    const serviceId = String(data.get("serviceId"));
    try {
      await createBundle({
        name: String(data.get("name")),
        description: String(data.get("description")),
        productItems: productId
          ? [{ productId, quantity: Number(data.get("quantity")) }]
          : [],
        serviceIds: serviceId ? [serviceId] : [],
        bundlePrice: Math.round(Number(data.get("bundlePrice")) * 100),
      });
      form.reset();
      setMessage("Bundle created.");
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="font-semibold uppercase tracking-widest text-brand">
        Administration
      </p>
      <h1 className="mt-2 text-4xl font-black">Solution bundles</h1>
      {error && <Notice message={error} />}
      {message && <Notice message={message} tone="success" />}
      <form
        onSubmit={submit}
        className="mt-8 grid gap-3 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <input
          required
          name="name"
          placeholder="Bundle name"
          className="rounded-xl border p-3"
        />
        <input
          required
          name="bundlePrice"
          type="number"
          min="0"
          step="0.01"
          placeholder="Bundle price in BDT"
          className="rounded-xl border p-3"
        />
        <select name="productId" className="rounded-xl border p-3">
          <option value="">No product</option>
          {products.map((product) => (
            <option key={product._id} value={product._id}>
              {product.name}
            </option>
          ))}
        </select>
        <input
          name="quantity"
          type="number"
          min="1"
          max="99"
          defaultValue="1"
          className="rounded-xl border p-3"
        />
        <select name="serviceId" className="rounded-xl border p-3">
          <option value="">No service</option>
          {services.map((service) => (
            <option key={service._id} value={service._id}>
              {service.name}
            </option>
          ))}
        </select>
        <textarea
          required
          name="description"
          placeholder="Description"
          className="rounded-xl border p-3 md:col-span-2"
        />
        <button className="w-fit rounded-xl bg-brand px-5 py-3 font-semibold text-white">
          Create bundle
        </button>
      </form>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {bundles.map((bundle) => (
          <article
            key={bundle._id}
            className="rounded-2xl bg-white p-5 shadow-sm"
          >
            <h2 className="text-xl font-bold">{bundle.name}</h2>
            <p className="mt-2 text-slate-600">{bundle.description}</p>
            <p className="mt-3 font-black">{money(bundle.bundlePrice)}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
