import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiError, Notice } from "./ui";

export type EditField = {
  name: string;
  label: string;
  value: string | number;
  type?: "text" | "number" | "textarea";
  min?: number;
  max?: number;
  step?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
};

export function EditPanel({
  title,
  fields,
  onSave,
  onCancel,
}: {
  title: string;
  fields: EditField[];
  onSave: (data: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    heading.current?.scrollIntoView?.({ block: "center" });
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSave(data);
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label={title}
      className="my-6 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm"
    >
      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">
        {title}
      </h2>
      {error && <Notice message={error} />}
      <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={busy} className="mt-4 grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <label
              key={field.name}
              className="grid gap-1 text-sm font-semibold"
            >
              {field.label}
              {field.options ? (
                <select
                  name={field.name}
                  defaultValue={field.value}
                  className="rounded-lg border p-3"
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  defaultValue={field.value}
                  required={field.required !== false}
                  className="rounded-lg border p-3"
                />
              ) : (
                <input
                  name={field.name}
                  type={field.type ?? "text"}
                  defaultValue={field.value}
                  required={field.required !== false}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  className="rounded-lg border p-3"
                />
              )}
            </label>
          ))}
        </fieldset>
        <div className="mt-4 flex gap-3">
          <button
            disabled={busy}
            className="rounded-lg bg-brand px-4 py-2 font-semibold text-white"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border px-4 py-2"
          >
            Cancel editing
          </button>
        </div>
      </form>
    </section>
  );
}
