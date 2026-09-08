import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addCartItem, getCategories, getProducts } from "./commerce-api";
import type { Category, Product } from "./types";
import { apiError, Loading, money, Notice } from "./ui";
import { ProductImage } from "./ProductImage";
import { useAuth } from "../auth/auth-context";

export function ProductListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [addingId, setAddingId] = useState("");
  const [addedIds, setAddedIds] = useState<string[]>([]);
  async function add(productId: string) {
    if (!user) {
      navigate("/login", { state: { from: "/products" } });
      return;
    }
    if (user.role !== "customer") return;
    setAddingId(productId);
    setError("");
    try {
      await addCartItem(productId);
      setAddedIds((current) =>
        current.includes(productId) ? current : [...current, productId],
      );
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setAddingId("");
    }
  }
  async function load(params: Record<string, string> = {}) {
    setLoading(true);
    setError("");
    try {
      const [result, cats] = await Promise.all([
        getProducts(params),
        getCategories(),
      ]);
      setProducts(result.data.products);
      setCategories(cats);
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = Object.fromEntries(
      [...data.entries()].filter(([, value]) => value),
    );
    void load(params as Record<string, string>);
  }
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-semibold uppercase tracking-widest text-brand">
            Catalog
          </p>
          <h1 className="mt-2 text-4xl font-black">IT products</h1>
        </div>
      </div>
      <form
        onSubmit={filter}
        className="mt-8 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-4"
      >
        <input
          aria-label="Search products"
          name="q"
          placeholder="Search products"
          className="rounded-xl border px-3 py-2"
        />
        <select
          aria-label="Category"
          name="category"
          className="rounded-xl border px-3 py-2"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort"
          name="sort"
          className="rounded-xl border px-3 py-2"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
        <button className="rounded-xl bg-brand px-4 py-2 font-semibold text-white">
          Apply
        </button>
      </form>
      {compareIds.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 p-3 text-sm">
          <span>
            <strong>{compareIds.length} selected.</strong> Comparison shows
            price and specifications side by side; it does not add products to
            your cart.
          </span>
          {compareIds.length >= 2 && (
            <Link
              to={`/compare?ids=${compareIds.join(",")}`}
              className="font-bold text-brand"
            >
              Compare now
            </Link>
          )}
        </div>
      )}
      {error && (
        <div className="mt-6">
          <Notice message={error} />
        </div>
      )}
      {loading ? (
        <Loading />
      ) : products.length === 0 ? (
        <p className="py-16 text-center text-slate-500">
          No matching products found.
        </p>
      ) : (
        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product._id}
              className="overflow-hidden rounded-2xl border bg-white shadow-sm"
            >
              <div className="h-52 overflow-hidden bg-slate-100">
                <ProductImage
                  urls={product.imageUrls}
                  name={product.name}
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  {product.brand}
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  <Link
                    to={`/products/${product._id}`}
                    className="hover:text-brand"
                  >
                    {product.name}
                  </Link>
                </h2>
                <p className="mt-3 text-lg font-black">
                  {money(product.price - product.discount)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {product.stock > 0
                    ? `${product.stock} in stock`
                    : "Out of stock"}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {addedIds.includes(product._id) ? (
                    <Link
                      to="/cart"
                      className="rounded-xl bg-slate-950 px-3 py-2.5 text-center text-sm font-bold text-white"
                    >
                      View cart
                    </Link>
                  ) : (
                    <button
                      onClick={() => void add(product._id)}
                      disabled={
                        product.stock === 0 ||
                        addingId === product._id ||
                        (user !== null && user.role !== "customer")
                      }
                      className="rounded-xl bg-brand px-3 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {addingId === product._id
                        ? "Adding…"
                        : !user
                          ? "Sign in to buy"
                          : "Add to cart"}
                    </button>
                  )}
                  <Link
                    to={`/products/${product._id}`}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm font-bold"
                  >
                    View details
                  </Link>
                </div>
                <button
                  onClick={() =>
                    setCompareIds((current) =>
                      current.includes(product._id)
                        ? current.filter((id) => id !== product._id)
                        : current.length < 3
                          ? [...current, product._id]
                          : current,
                    )
                  }
                  className="mt-4 text-sm font-semibold text-slate-500 hover:text-brand"
                >
                  {compareIds.includes(product._id)
                    ? "Remove from side-by-side comparison"
                    : "Compare specifications"}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
