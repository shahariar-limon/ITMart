/* eslint-disable react-refresh/only-export-components */
import axios from "axios";

export function money(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value / 100);
}
export function apiError(error: unknown) {
  return axios.isAxiosError(error)
    ? (error.response?.data?.error?.message ??
        "The request could not be completed.")
    : "An unexpected error occurred.";
}
export function Notice({
  message,
  tone = "error",
}: {
  message: string;
  tone?: "error" | "success";
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl p-3 text-sm ${tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
    >
      {message}
    </p>
  );
}
export function Loading() {
  return (
    <p role="status" className="py-12 text-center text-slate-500">
      Loading…
    </p>
  );
}
