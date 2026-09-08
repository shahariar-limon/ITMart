import { useEffect, useState, type FormEvent } from "react";
import { apiError, money, Notice } from "../commerce/ui";
import { createService, getServices, updateService } from "./services-api";
import type { Service } from "./types";
import { EditPanel } from "../commerce/EditPanel";

export function AdminServicesPage() {
  const [editing, setEditing] = useState<Service | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    try {
      setServices(await getServices());
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
    try {
      await createService({
        name: String(data.get("name")),
        category: String(data.get("category")),
        description: String(data.get("description")),
        priceModel: String(data.get("priceModel")) as
          "fixed" | "starting_at" | "quote",
        basePrice: Math.round(Number(data.get("basePrice")) * 100),
        durationMinutes: Number(data.get("durationMinutes")),
      });
      form.reset();
      setMessage("Service created.");
      setError("");
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function archive(service: Service) {
    if (!window.confirm("Make this service unavailable?")) return;
    try {
      await updateService(service._id, { isActive: false });
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
      <h1 className="mt-2 text-4xl font-black">Service catalog</h1>
      {error && (
        <div className="mt-5">
          <Notice message={error} />
        </div>
      )}
      {message && (
        <div className="mt-5">
          <Notice message={message} tone="success" />
        </div>
      )}
      <form
        onSubmit={submit}
        className="mt-8 grid gap-3 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <input
          required
          name="name"
          placeholder="Service name"
          className="rounded-xl border p-3"
        />
        <input
          required
          name="category"
          placeholder="Category"
          className="rounded-xl border p-3"
        />
        <select required name="priceModel" className="rounded-xl border p-3">
          <option value="fixed">Fixed price</option>
          <option value="starting_at">Starting at</option>
          <option value="quote">Quote</option>
        </select>
        <input
          required
          name="basePrice"
          type="number"
          min="0"
          step="0.01"
          placeholder="Base price in BDT"
          className="rounded-xl border p-3"
        />
        <input
          required
          name="durationMinutes"
          type="number"
          min="15"
          max="1440"
          placeholder="Duration in minutes"
          className="rounded-xl border p-3"
        />
        <textarea
          required
          name="description"
          placeholder="Description"
          className="rounded-xl border p-3 md:col-span-2"
        />
        <button className="w-fit rounded-xl bg-brand px-5 py-3 font-semibold text-white">
          Create service
        </button>
      </form>
      {editing && (
        <EditPanel
          key={editing._id}
          title={`Edit service: ${editing.name}`}
          onCancel={() => setEditing(null)}
          fields={[
            { name: "name", label: "Service name", value: editing.name },
            { name: "category", label: "Category", value: editing.category },
            {
              name: "description",
              label: "Description",
              value: editing.description,
              type: "textarea",
            },
            {
              name: "priceModel",
              label: "Pricing model",
              value: editing.priceModel,
              options: [
                { value: "fixed", label: "Fixed price" },
                { value: "starting_at", label: "Starting at" },
                { value: "quote", label: "Quote" },
              ],
            },
            {
              name: "basePrice",
              label: "Price (BDT)",
              value: editing.basePrice / 100,
              type: "number",
              min: 0,
              step: "0.01",
            },
            {
              name: "durationMinutes",
              label: "Duration (minutes)",
              value: editing.durationMinutes,
              type: "number",
              min: 15,
              max: 1440,
            },
          ]}
          onSave={async (data) => {
            await updateService(editing._id, {
              name: String(data.get("name")),
              category: String(data.get("category")),
              description: String(data.get("description")),
              priceModel: String(
                data.get("priceModel"),
              ) as Service["priceModel"],
              basePrice: Math.round(Number(data.get("basePrice")) * 100),
              durationMinutes: Number(data.get("durationMinutes")),
            });
            setEditing(null);
            setMessage("Service updated.");
            await load();
          }}
        />
      )}
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <article
            key={service._id}
            className="rounded-2xl bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase text-brand">
              {service.category}
            </p>
            <h2 className="mt-1 text-xl font-bold">{service.name}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {service.durationMinutes} minutes · {money(service.basePrice)}
            </p>
            <button
              onClick={() => setEditing(service)}
              className="mr-4 mt-4 font-semibold text-brand"
            >
              Edit
            </button>
            <button
              onClick={() => void archive(service)}
              className="mt-4 font-semibold text-red-700"
            >
              Make unavailable
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
