import { useEffect, useState, type FormEvent } from "react";
import {
  archiveProduct,
  createCategory,
  createProduct,
  getCategories,
  getProducts,
} from "./commerce-api";
import type { Category, Product } from "./types";
import { apiError, money, Notice } from "./ui";

export function AdminCatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function load() {
    try {
      const [cats, result] = await Promise.all([
        getCategories(),
        getProducts({ limit: 100 }),
      ]);
      setCategories(cats);
      setProducts(result.data.products);
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await createCategory({
        name: String(data.get("name")),
        slug: String(data.get("slug")),
        description: "",
      });
      form.reset();
      setMessage("Category created.");
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await createProduct({
        name: String(data.get("name")),
        sku: String(data.get("sku")),
        categoryId: String(data.get("categoryId")),
        brand: String(data.get("brand")),
        description: String(data.get("description")),
        price: Math.round(Number(data.get("price")) * 100),
        discount: 0,
        stock: Number(data.get("stock")),
        tags: [],
        imageUrls: [],
        specs: {},
        warranty: "",
      });
      form.reset();
      setMessage("Product created.");
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function archive(id: string) {
    if (!window.confirm("Archive this product?")) return;
    try {
      await archiveProduct(id);
      await load();
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="font-semibold uppercase tracking-widest text-brand">
        Administration
      </p>
      <h1 className="mt-2 text-4xl font-black">Catalog management</h1>
      {error && (
        <div className="mt-5">
          <Notice message={error} />
        </div>
      )}
      {message && (
        <div className="mt-5">
          <Notice message={message} tone="success" />
        </div>
      )}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={addCategory}
          className="rounded-2xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold">New category</h2>
          <input
            required
            name="name"
            placeholder="Category name"
            className="mt-4 w-full rounded-xl border p-3"
          />
          <input
            required
            name="slug"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="category-slug"
            className="mt-3 w-full rounded-xl border p-3"
          />
          <button className="mt-4 rounded-xl bg-brand px-4 py-2 font-semibold text-white">
            Create category
          </button>
        </form>
        <form
          onSubmit={addProduct}
          className="rounded-2xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold">New product</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              required
              name="name"
              placeholder="Product name"
              className="rounded-xl border p-3"
            />
            <input
              required
              name="sku"
              placeholder="SKU"
              className="rounded-xl border p-3"
            />
            <input
              required
              name="brand"
              placeholder="Brand"
              className="rounded-xl border p-3"
            />
            <select
              required
              name="categoryId"
              className="rounded-xl border p-3"
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              required
              name="price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Price in BDT"
              className="rounded-xl border p-3"
            />
            <input
              required
              name="stock"
              type="number"
              min="0"
              placeholder="Stock"
              className="rounded-xl border p-3"
            />
            <textarea
              required
              name="description"
              placeholder="Description"
              className="rounded-xl border p-3 sm:col-span-2"
            />
          </div>
          <button className="mt-4 rounded-xl bg-brand px-4 py-2 font-semibold text-white">
            Create product
          </button>
        </form>
      </div>
      <section className="mt-8 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="p-4">Product</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Price</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id} className="border-b">
                <td className="p-4 font-semibold">{product.name}</td>
                <td className="p-4">{product.sku}</td>
                <td className="p-4">
                  {money(product.price - product.discount)}
                </td>
                <td className="p-4">{product.stock}</td>
                <td className="p-4">
                  <button
                    onClick={() => void archive(product._id)}
                    className="font-semibold text-red-700"
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
