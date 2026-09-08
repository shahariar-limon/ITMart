import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { apiError, Loading, Notice } from "../commerce/ui";
type Audit = {
  _id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  actor?: { name: string; email: string };
};
type Message = {
  _id: string;
  template: string;
  subject: string;
  status: "pending" | "sent" | "failed";
  attempts: number;
  createdAt: string;
};
export function OperationsPage() {
  const [logs, setLogs] = useState<Audit[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const [audit, queue] = await Promise.all([
        apiClient.get("/admin/audit-logs"),
        apiClient.get("/admin/communications"),
      ]);
      setLogs(audit.data.data.logs);
      setMessages(queue.data.data.messages);
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function process() {
    setBusy(true);
    try {
      await apiClient.post("/admin/communications/process");
      await load();
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  }
  if (!logs)
    return error ? (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <Notice message={error} />
      </main>
    ) : (
      <Loading />
    );
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="eyebrow">OPERATIONS CONTROL</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">Audit & communication</h1>
          <p className="mt-2 text-slate-600">
            Trace sensitive commerce actions and safely deliver queued messages.
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() => void process()}
          className="rounded-xl bg-brand px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          {busy ? "Processing…" : "Process queue"}
        </button>
      </div>
      {error && (
        <div className="mt-5">
          <Notice message={error} />
        </div>
      )}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="commerce-card overflow-hidden rounded-2xl border bg-white">
          <h2 className="border-b p-5 text-xl font-black">
            Immutable activity log
          </h2>
          <div className="divide-y">
            {logs.map((log) => (
              <article key={log._id} className="p-5">
                <div className="flex justify-between gap-3">
                  <strong className="text-sm">{log.action}</strong>
                  <time className="text-xs text-slate-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </time>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {log.actor?.name ?? "System"} · {log.resourceType} ·{" "}
                  {log.resourceId.slice(0, 8)}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="commerce-card overflow-hidden rounded-2xl border bg-white">
          <h2 className="border-b p-5 text-xl font-black">
            Transactional outbox
          </h2>
          <div className="divide-y">
            {messages.length ? (
              messages.map((item) => (
                <article key={item._id} className="p-5">
                  <div className="flex justify-between gap-3">
                    <strong className="text-sm">{item.subject}</strong>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${item.status === "sent" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.template} · {item.attempts} attempt(s)
                  </p>
                </article>
              ))
            ) : (
              <p className="p-5 text-sm text-slate-500">Queue is empty.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
