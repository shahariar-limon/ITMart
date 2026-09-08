import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiClient } from "../../api/client";
import { useAuth } from "../auth/auth-context";
import { getProducts } from "../commerce/commerce-api";
import type { Product } from "../commerce/types";
import { apiError, money, Notice } from "../commerce/ui";
import { getServices } from "../services/services-api";
import type { Service } from "../services/types";
type Solution = {
  _id: string;
  title: string;
  requirements: string;
  status: "submitted" | "quoted" | "accepted" | "rejected";
  quotedPrice?: number;
  adminNotes: string;
  expiresAt?: string;
};
type Envelope<T> = { success: true; data: T };
export function FutureFeaturesPage() {
  const { user } = useAuth();
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const response =
        await apiClient.get<Envelope<{ solutions: Solution[] }>>("/solutions");
      setSolutions(response.data.data.solutions);
      if (user?.role === "admin") {
        const [productResult, serviceResult] = await Promise.all([
          getProducts({ limit: 100 }),
          getServices(),
        ]);
        setProducts(productResult.data.products);
        setServices(serviceResult);
      }
    } catch (caught) {
      setError(apiError(caught));
    }
  }, [user?.role]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await apiClient.post("/solutions", {
        title: String(data.get("title")),
        requirements: String(data.get("requirements")),
      });
      form.reset();
      setMessage("Solution request submitted.");
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function quote(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const productId = String(data.get("productId"));
    const serviceId = String(data.get("serviceId"));
    try {
      await apiClient.patch(`/solutions/${id}/quote`, {
        productItems: productId ? [{ productId, quantity: 1 }] : [],
        serviceIds: serviceId ? [serviceId] : [],
        quotedPrice: Math.round(Number(data.get("price")) * 100),
        adminNotes: String(data.get("notes")),
        expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      });
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function decide(id: string, decision: "accept" | "reject") {
    try {
      await apiClient.post(
        `/solutions/${id}/decision`,
        decision === "accept"
          ? {
              decision,
              shippingAddress:
                window.prompt("Delivery and service address") ?? "",
            }
          : { decision },
      );
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-black">Custom IT solutions</h1>
      {error && <Notice message={error} />}
      {message && <Notice message={message} tone="success" />}
      {user?.role === "customer" && (
        <form
          onSubmit={submit}
          className="mt-8 rounded-2xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold">Describe your requirement</h2>
          <input
            required
            name="title"
            placeholder="Project title"
            className="mt-4 w-full rounded-xl border p-3"
          />
          <textarea
            required
            minLength={10}
            name="requirements"
            placeholder="Equipment, service, location, capacity, and constraints"
            className="mt-3 w-full rounded-xl border p-3"
          />
          <button className="mt-3 rounded-xl bg-brand px-5 py-3 font-semibold text-white">
            Submit request
          </button>
        </form>
      )}
      <section className="mt-8 space-y-4">
        {solutions.map((solution) => (
          <article
            key={solution._id}
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <div className="flex justify-between">
              <h2 className="text-xl font-bold">{solution.title}</h2>
              <span className="capitalize text-brand">{solution.status}</span>
            </div>
            <p className="mt-2 text-slate-600">{solution.requirements}</p>
            {solution.quotedPrice !== undefined && (
              <p className="mt-3 font-black">
                Quote: {money(solution.quotedPrice)}
              </p>
            )}
            {user?.role === "admin" &&
              ["submitted", "quoted"].includes(solution.status) && (
                <form
                  onSubmit={(event) => void quote(event, solution._id)}
                  className="mt-4 grid gap-2 md:grid-cols-2"
                >
                  <select name="productId" className="rounded border p-2">
                    <option value="">No product</option>
                    {products.map((item) => (
                      <option value={item._id} key={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <select name="serviceId" className="rounded border p-2">
                    <option value="">No service</option>
                    {services.map((item) => (
                      <option value={item._id} key={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    name="price"
                    type="number"
                    min="0"
                    step=".01"
                    placeholder="Quoted BDT"
                    className="rounded border p-2"
                  />
                  <input
                    name="notes"
                    placeholder="Admin notes"
                    className="rounded border p-2"
                  />
                  <button className="w-fit rounded bg-brand px-4 py-2 text-white">
                    Send quote
                  </button>
                </form>
              )}
            {user?.role === "customer" && solution.status === "quoted" && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => void decide(solution._id, "accept")}
                  className="rounded bg-brand px-4 py-2 text-white"
                >
                  Accept
                </button>
                <button
                  onClick={() => void decide(solution._id, "reject")}
                  className="rounded border px-4 py-2"
                >
                  Reject
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
