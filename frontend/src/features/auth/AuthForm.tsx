import axios from "axios";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login, register } from "./auth-api";
import { useAuth } from "./auth-context";

type Props = { mode: "login" | "register" };

export function AuthForm({ mode }: Props) {
  const isRegister = mode === "register";
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const credentials = {
        email: String(data.get("email")),
        password: String(data.get("password")),
      };
      const result = isRegister
        ? await register({ ...credentials, name: String(data.get("name")) })
        : await login(credentials);
      signIn(result);
      const state = location.state as { from?: string } | null;
      navigate(state?.from ?? "/dashboard", { replace: true });
    } catch (caught) {
      if (axios.isAxiosError(caught)) {
        setError(
          caught.response?.data?.error?.message ??
            "Unable to connect to ITMart. Please try again.",
        );
      } else setError("An unexpected error occurred.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-73px)] place-items-center px-4 py-12">
      <section
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        aria-labelledby="auth-title"
      >
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Secure account access
        </p>
        <h1 id="auth-title" className="text-3xl font-bold">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-slate-600">
          {isRegister
            ? "Start shopping and booking IT services."
            : "Sign in to manage orders and services."}
        </p>
        <form className="mt-8 space-y-5" onSubmit={submit}>
          {isRegister && (
            <Field
              label="Full name"
              name="name"
              type="text"
              autoComplete="name"
              minLength={2}
            />
          )}
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={8}
          />
          {isRegister && (
            <p className="text-xs text-slate-500">
              Use at least 8 characters with uppercase, lowercase, and a number.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          {isRegister ? "Already registered?" : "New to ITMart?"}{" "}
          <Link
            className="font-semibold text-brand hover:underline"
            to={isRegister ? "/login" : "/register"}
          >
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
        {!isRegister && import.meta.env.DEV && (
          <div className="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <p className="text-xs font-black uppercase tracking-[.16em] text-emerald-800">Demo access</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">Password for every demo account: <code className="font-bold text-slate-900">Demo@12345</code></p>
            <div className="mt-3 space-y-1 text-xs text-slate-700">
              <p><strong>Customer:</strong> customer@itmart.test</p>
              <p><strong>Technician:</strong> technician@itmart.test</p>
              <p><strong>Admin:</strong> admin@itmart.test</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Field(props: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  minLength?: number;
}) {
  return (
    <label className="block text-sm font-medium">
      <span>{props.label}</span>
      <input
        {...props}
        required
        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-brand"
      />
    </label>
  );
}
