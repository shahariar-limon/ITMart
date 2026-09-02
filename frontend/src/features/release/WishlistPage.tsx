import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiError, Loading, money, Notice } from "../commerce/ui";
import { getWishlist, removeWishlist } from "./release-api";
import type { Wishlist } from "./types";
export function WishlistPage() {
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [error, setError] = useState("");
  async function load() {
    try {
      setWishlist(await getWishlist());
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function remove(id: string) {
    try {
      await removeWishlist(id);
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  if (!wishlist)
    return error ? (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Notice message={error} />
      </main>
    ) : (
      <Loading />
    );
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-4xl font-black">Wishlist</h1>
      {error && <Notice message={error} />}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {wishlist.productIds.length === 0 ? (
          <p className="text-slate-500">Your wishlist is empty.</p>
        ) : (
          wishlist.productIds.map((product) => (
            <article
              key={product._id}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <Link
                to={`/products/${product._id}`}
                className="text-xl font-bold hover:text-brand"
              >
                {product.name}
              </Link>
              <p className="mt-2">{money(product.price - product.discount)}</p>
              <button
                onClick={() => void remove(product._id)}
                className="mt-4 font-semibold text-red-700"
              >
                Remove
              </button>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
