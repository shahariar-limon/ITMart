import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { apiError, Loading, money, Notice } from "../commerce/ui";
import { createBooking, getServices } from "./services-api";
import type { Service } from "./types";

export function ServicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[] | null>(null);
  const [selected, setSelected] = useState<Service | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    getServices()
      .then(setServices)
      .catch((caught) => setError(apiError(caught)));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      navigate("/login", { state: { from: "/services" } });
      return;
    }
    if (!selected) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const preferred = String(data.get("preferredStart"));
      const booking = await createBooking({
        serviceId: selected._id,
        ...(preferred
          ? { preferredStart: new Date(preferred).toISOString() }
          : {}),
        address: String(data.get("address")),
        customerNotes: String(data.get("customerNotes")),
      });
      setSuccess(`Request ${booking.bookingNumber} was submitted.`);
      setSelected(null);
      form.reset();
    } catch (caught) {
      setError(apiError(caught));
    }
  }

  if (!services)
    return error ? (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Notice message={error} />
      </main>
    ) : (
      <Loading />
    );
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-semibold uppercase tracking-widest text-brand">
            Technical support
          </p>
          <h1 className="mt-2 text-4xl font-black">Book a service</h1>
        </div>
        {user && (
          <Link to="/bookings" className="font-semibold text-brand">
            View my bookings
          </Link>
        )}
      </div>
      {error && (
        <div className="mt-5">
          <Notice message={error} />
        </div>
      )}
      {success && (
        <div className="mt-5">
          <Notice message={success} tone="success" />
        </div>
      )}
      <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {services.length === 0 ? (
          <p className="text-slate-500">No services are currently available.</p>
        ) : (
          services.map((service) => (
            <article
              key={service._id}
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                {service.category}
              </p>
              <h2 className="mt-2 text-2xl font-bold">{service.name}</h2>
              <p className="mt-3 line-clamp-3 text-slate-600">
                {service.description}
              </p>
              <p className="mt-5 font-black">
                {service.priceModel === "quote"
                  ? "Price on request"
                  : `${service.priceModel === "starting_at" ? "From " : ""}${money(service.basePrice)}`}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Estimated {service.durationMinutes} minutes
              </p>
              {user?.role === "customer" || !user ? (
                <button
                  onClick={() => setSelected(service)}
                  className="mt-5 rounded-xl bg-brand px-4 py-2 font-semibold text-white"
                >
                  Request service
                </button>
              ) : null}
            </article>
          ))
        )}
      </section>
      {selected && (
        <section className="mt-10 rounded-2xl bg-ink p-6 text-white">
          <h2 className="text-2xl font-bold">Request {selected.name}</h2>
          <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Preferred date and time
              <input
                name="preferredStart"
                type="datetime-local"
                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 p-3"
              />
            </label>
            <label className="text-sm font-medium">
              Service address
              <textarea
                name="address"
                required
                minLength={10}
                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 p-3"
              />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Additional details
              <textarea
                name="customerNotes"
                maxLength={2000}
                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 p-3"
              />
            </label>
            <div className="flex gap-3">
              <button className="rounded-xl bg-brand px-5 py-3 font-semibold">
                Submit request
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-slate-600 px-5 py-3"
              >
                Close
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
