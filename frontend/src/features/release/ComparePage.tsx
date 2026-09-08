import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getProduct } from "../commerce/commerce-api";
import type { Product } from "../commerce/types";
import { apiError, Loading, money, Notice } from "../commerce/ui";
export function ComparePage() {
  const [params] = useSearchParams();
  const idsParam = params.get("ids") ?? "";
  const ids = useMemo(
    () => idsParam.split(",").filter(Boolean).slice(0, 3),
    [idsParam],
  );
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all(ids.map(getProduct))
      .then(setProducts)
      .catch((caught) => setError(apiError(caught)));
  }, [ids]);
  if (error)
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <Notice message={error} />
      </main>
    );
  if (!products) return <Loading />;
  const categories = new Set(products.map((product) => product.categoryId));
  if (products.length < 2 || categories.size !== 1)
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <Notice message="Choose two or three products from the same category." />
      </main>
    );
  const specs = [
    ...new Set(products.flatMap((product) => Object.keys(product.specs))),
  ].sort();
  return (
    <main className="mx-auto max-w-6xl overflow-x-auto px-4 py-12">
      <h1 className="text-4xl font-black">Product comparison</h1>
      <p className="mt-3 max-w-3xl text-slate-600">
        Use this table when choosing between similar products. It places price,
        stock, brand, and technical specifications next to each other. When you
        decide, open that product and add it to your cart.
      </p>
      <table className="mt-8 w-full min-w-[700px] overflow-hidden rounded-2xl bg-white text-left shadow-sm">
        <thead>
          <tr>
            <th className="p-4">Attribute</th>
            {products.map((product) => (
              <th key={product._id} className="p-4 text-xl">
                {product.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Row
            label="Price"
            values={products.map((product) =>
              money(product.price - product.discount),
            )}
          />
          <Row
            label="Brand"
            values={products.map((product) => product.brand)}
          />
          <Row
            label="Stock"
            values={products.map((product) => String(product.stock))}
          />
          {specs.map((spec) => (
            <Row
              key={spec}
              label={spec}
              values={products.map((product) => product.specs[spec] ?? "—")}
            />
          ))}
        </tbody>
      </table>
      <Link to="/products" className="mt-6 inline-block font-bold text-brand">
        ← Back to products
      </Link>
    </main>
  );
}
function Row({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="border-t">
      <th className="p-4 capitalize">{label}</th>
      {values.map((value, index) => (
        <td key={`${label}-${index}`} className="p-4">
          {value}
        </td>
      ))}
    </tr>
  );
}
