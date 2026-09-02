import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/auth-context";
import { apiError, Loading, money, Notice } from "../commerce/ui";
import {
  assignBooking,
  cancelBooking,
  getBookings,
  getTechnicians,
  scheduleBooking,
  updateBookingStatus,
} from "./services-api";
import type { Booking, BookingStatus, Technician } from "./types";

export function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [items, techs] = await Promise.all([
        getBookings(),
        user?.role === "admin" ? getTechnicians() : Promise.resolve([]),
      ]);
      setBookings(items);
      setTechnicians(techs);
    } catch (caught) {
      setError(apiError(caught));
    }
  }, [user?.role]);
  useEffect(() => {
    void load();
  }, [load]);
  async function status(id: string, next: BookingStatus) {
    try {
      await updateBookingStatus(id, next);
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function assign(id: string, technicianId: string) {
    if (!technicianId) return;
    try {
      await assignBooking(id, technicianId);
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function schedule(id: string, localDate: string) {
    if (!localDate) return;
    try {
      await scheduleBooking(id, new Date(localDate).toISOString());
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function cancel(id: string) {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      await cancelBooking(id);
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  if (!bookings)
    return error ? (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Notice message={error} />
      </main>
    ) : (
      <Loading />
    );
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="font-semibold uppercase tracking-widest text-brand">
        {user?.role === "admin"
          ? "Service operations"
          : user?.role === "technician"
            ? "Assigned work"
            : "Service history"}
      </p>
      <h1 className="mt-2 text-4xl font-black">Bookings</h1>
      {error && (
        <div className="mt-5">
          <Notice message={error} />
        </div>
      )}
      <section className="mt-8 space-y-5">
        {bookings.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-slate-500">
            No bookings found.
          </p>
        ) : (
          bookings.map((booking) => (
            <article
              key={booking._id}
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">
                    {booking.bookingNumber}
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    {booking.serviceNameSnapshot}
                  </h2>
                  <p className="mt-1 capitalize text-brand">
                    {booking.status.replace("_", " ")}
                  </p>
                </div>
                <p className="font-black">{money(booking.basePriceSnapshot)}</p>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <p>Address: {booking.address}</p>
                <p>Duration: {booking.durationMinutesSnapshot} minutes</p>
                {booking.preferredStart && (
                  <p>
                    Preferred:{" "}
                    {new Date(booking.preferredStart).toLocaleString()}
                  </p>
                )}
                {booking.scheduledStart && (
                  <p>
                    Scheduled:{" "}
                    {new Date(booking.scheduledStart).toLocaleString()}
                  </p>
                )}
                {booking.technicianId &&
                  typeof booking.technicianId !== "string" && (
                    <p>Technician: {booking.technicianId.name}</p>
                  )}
                {booking.technicianNotes && (
                  <p>Technician notes: {booking.technicianNotes}</p>
                )}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {user?.role === "admin" && booking.status === "requested" && (
                  <button
                    onClick={() => void status(booking._id, "confirmed")}
                    className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white"
                  >
                    Confirm
                  </button>
                )}
                {user?.role === "admin" &&
                  ["confirmed", "assigned"].includes(booking.status) && (
                    <select
                      aria-label={`Assign technician for ${booking.bookingNumber}`}
                      defaultValue={
                        typeof booking.technicianId === "object"
                          ? booking.technicianId._id
                          : ""
                      }
                      onChange={(event) =>
                        void assign(booking._id, event.target.value)
                      }
                      className="rounded-lg border p-2"
                    >
                      <option value="">Assign technician</option>
                      {technicians.map((tech) => (
                        <option key={tech._id} value={tech._id}>
                          {tech.name}
                        </option>
                      ))}
                    </select>
                  )}
                {user?.role === "admin" &&
                  ["assigned", "scheduled"].includes(booking.status) && (
                    <label className="text-sm">
                      Schedule{" "}
                      <input
                        type="datetime-local"
                        onChange={(event) =>
                          void schedule(booking._id, event.target.value)
                        }
                        className="ml-2 rounded-lg border p-2"
                      />
                    </label>
                  )}
                {user?.role === "technician" &&
                  booking.status === "scheduled" && (
                    <button
                      onClick={() => void status(booking._id, "in_progress")}
                      className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white"
                    >
                      Start work
                    </button>
                  )}
                {user?.role === "technician" &&
                  booking.status === "in_progress" && (
                    <button
                      onClick={() => void status(booking._id, "completed")}
                      className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white"
                    >
                      Mark complete
                    </button>
                  )}
                {(user?.role === "customer" || user?.role === "admin") &&
                  ["requested", "confirmed", "assigned", "scheduled"].includes(
                    booking.status,
                  ) && (
                    <button
                      onClick={() => void cancel(booking._id)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                    >
                      Cancel
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
