import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { EditPanel } from "../commerce/EditPanel";
import { apiError, Notice } from "../commerce/ui";

type ManagedUser = {
  _id: string;
  name: string;
  email: string;
  role: "customer" | "technician" | "admin";
  isActive: boolean;
};
export function AdminUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const result = await apiClient.get<{
        data: { users: ManagedUser[] };
        meta: { totalPages: number };
      }>("/users", { params: { q: search, page, limit: 20 } });
      setUsers(result.data.data.users);
      setPages(result.data.meta.totalPages);
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  }, [search, page]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="font-semibold uppercase tracking-widest text-brand">
        Administration
      </p>
      <h1 className="mt-2 text-4xl font-black">User management</h1>
      <p className="mt-3 text-slate-600">
        Edit names, assign roles, and activate or deactivate customer and
        technician accounts. Existing administrator access is protected.
      </p>
      {error && <Notice message={error} />}
      {message && <Notice message={message} tone="success" />}
      <form
        className="my-6 flex gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(query);
        }}
      >
        <input
          aria-label="Search users"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          className="min-w-0 flex-1 rounded-xl border p-3"
        />
        <button className="rounded-xl bg-brand px-5 py-3 font-semibold text-white">
          Search
        </button>
      </form>
      {editing && (
        <EditPanel
          key={editing._id}
          title={`Edit user: ${editing.name}`}
          onCancel={() => setEditing(null)}
          fields={[
            { name: "name", label: "Full name", value: editing.name },
            ...(editing.role === "admin"
              ? []
              : [
                  {
                    name: "role",
                    label: "Role",
                    value: editing.role,
                    options: [
                      { value: "customer", label: "Customer" },
                      { value: "technician", label: "Technician" },
                      { value: "admin", label: "Admin" },
                    ],
                  },
                  {
                    name: "isActive",
                    label: "Account status",
                    value: String(editing.isActive),
                    options: [
                      { value: "true", label: "Active" },
                      { value: "false", label: "Inactive" },
                    ],
                  },
                ]),
          ]}
          onSave={async (data) => {
            await apiClient.patch(`/users/${editing._id}`, {
              name: String(data.get("name")),
              ...(editing.role === "admin"
                ? {}
                : {
                    role: String(data.get("role")),
                    isActive: data.get("isActive") === "true",
                  }),
            });
            setEditing(null);
            setMessage("User updated. Access changes apply immediately.");
            await load();
          }}
        />
      )}
      <section
        className="overflow-x-auto rounded-2xl bg-white shadow-sm"
        aria-busy={busy}
      >
        <table className="w-full text-left">
          <thead>
            <tr>
              {["Name", "Email", "Role", "Status", "Actions"].map((label) => (
                <th key={label} className="p-4">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-t">
                <td className="p-4 font-semibold">{user.name}</td>
                <td className="p-4">{user.email}</td>
                <td className="p-4 capitalize">{user.role}</td>
                <td className="p-4">{user.isActive ? "Active" : "Inactive"}</td>
                <td className="p-4">
                  <button
                    className="font-semibold text-brand"
                    onClick={() => setEditing(user)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && (
          <p className="p-6">{busy ? "Loading users…" : "No users found."}</p>
        )}
      </section>
      <div className="mt-5 flex items-center gap-4">
        <button
          disabled={busy || page <= 1}
          onClick={() => setPage(page - 1)}
          className="rounded-lg border px-3 py-2 disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {page} of {Math.max(1, pages)}
        </span>
        <button
          disabled={busy || page >= pages}
          onClick={() => setPage(page + 1)}
          className="rounded-lg border px-3 py-2 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </main>
  );
}
