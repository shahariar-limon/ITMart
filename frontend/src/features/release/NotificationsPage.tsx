import { useEffect, useState } from "react";
import { apiError, Loading, Notice } from "../commerce/ui";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./release-api";
import type { Notification } from "./types";
export function NotificationsPage() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  async function load() {
    try {
      const result = await getNotifications();
      setItems(result.notifications);
      setUnread(result.unreadCount);
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function read(id: string) {
    try {
      await markNotificationRead(id);
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function all() {
    try {
      await markAllNotificationsRead();
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  if (!items)
    return error ? (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <Notice message={error} />
      </main>
    ) : (
      <Loading />
    );
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-semibold uppercase tracking-widest text-brand">
            Inbox
          </p>
          <h1 className="mt-2 text-4xl font-black">Notifications</h1>
        </div>
        {unread > 0 && (
          <button
            onClick={() => void all()}
            className="font-semibold text-brand"
          >
            Mark all read ({unread})
          </button>
        )}
      </div>
      {error && <Notice message={error} />}
      <section className="mt-8 space-y-3">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-slate-500">
            No notifications yet.
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item._id}
              onClick={() => !item.readAt && void read(item._id)}
              className={`block w-full rounded-2xl border p-5 text-left shadow-sm ${item.readAt ? "bg-white" : "border-emerald-200 bg-emerald-50"}`}
            >
              <span className="font-bold">{item.title}</span>
              <span className="mt-1 block text-sm text-slate-600">
                {item.message}
              </span>
              <span className="mt-2 block text-xs text-slate-400">
                {new Date(item.createdAt).toLocaleString()}
              </span>
            </button>
          ))
        )}
      </section>
    </main>
  );
}
