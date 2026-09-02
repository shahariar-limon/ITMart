import { useEffect, useState } from "react";
import { apiError, Loading, money, Notice } from "../commerce/ui";
import { downloadReport, getReports } from "./release-api";
import type { ReportData } from "./types";
export function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getReports()
      .then(setData)
      .catch((caught) => setError(apiError(caught)));
  }, []);
  if (error)
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <Notice message={error} />
      </main>
    );
  if (!data) return <Loading />;
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-semibold uppercase tracking-widest text-brand">
            Administration · UTC
          </p>
          <h1 className="mt-2 text-4xl font-black">Reports</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => void downloadReport("sales.csv")}
            className="rounded-xl border bg-white px-4 py-2 font-semibold"
          >
            Export sales CSV
          </button>
          <button
            onClick={() => void downloadReport("services.csv")}
            className="rounded-xl border bg-white px-4 py-2 font-semibold"
          >
            Export services CSV
          </button>
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ReportTable
          title="Top products"
          headers={["Product", "Units", "Revenue"]}
          rows={data.topProducts.map((item) => [
            item.name,
            item.units,
            money(item.revenue),
          ])}
        />
        <ReportTable
          title="Sales by month"
          headers={["Month", "Orders", "Revenue"]}
          rows={data.salesByMonth.map((item) => [
            item.month,
            item.orders,
            money(item.revenue),
          ])}
        />
        <ReportTable
          title="Services by status"
          headers={["Status", "Count"]}
          rows={data.servicesByStatus.map((item) => [
            item.status.replace("_", " "),
            item.count,
          ])}
        />
        <ReportTable
          title="Top services"
          headers={["Service", "Completed", "Value"]}
          rows={data.topServices.map((item) => [
            item.name,
            item.completed,
            money(item.value),
          ])}
        />
      </div>
    </main>
  );
}
function ReportTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <section className="overflow-x-auto rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">{title}</h2>
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b p-2">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="p-3 text-slate-500">
                No data
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border-b p-2 capitalize">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
