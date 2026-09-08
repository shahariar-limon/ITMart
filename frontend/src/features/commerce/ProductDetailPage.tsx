import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { addWishlist, createReview, getReviews } from "../release/release-api";
import type { Review } from "../release/types";
import { addCartItem, getProduct } from "./commerce-api";
import type { Product } from "./types";
import { apiError, Loading, money, Notice } from "./ui";
import { ProductImage } from "./ProductImage";

export function ProductDetailPage() {
  const { productId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    Promise.all([getProduct(productId), getReviews(productId)])
      .then(([item, reviewData]) => {
        setProduct(item);
        setReviews(reviewData.reviews);
        setSummary(reviewData.summary);
      })
      .catch((caught) => setError(apiError(caught)));
  }, [productId]);
  function requireCustomer(): boolean {
    if (!user) {
      navigate("/login", { state: { from: `/products/${productId}` } });
      return false;
    }
    if (user.role !== "customer") {
      navigate("/forbidden");
      return false;
    }
    return true;
  }
  async function add() {
    if (!requireCustomer()) return;
    try {
      await addCartItem(productId);
      setMessage("Added to your cart.");
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function save() {
    if (!requireCustomer()) return;
    try {
      await addWishlist(productId);
      setMessage("Saved to your wishlist.");
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const review = await createReview(
        productId,
        Number(data.get("rating")),
        String(data.get("text")),
      );
      setReviews((current) => [review, ...current]);
      setSummary((current) => ({
        average:
          (current.average * current.count + review.rating) /
          (current.count + 1),
        count: current.count + 1,
      }));
      form.reset();
      setMessage("Review published.");
    } catch (caught) {
      setError(apiError(caught));
    }
  }
  if (error && !product)
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <Notice message={error} />
      </main>
    );
  if (!product) return <Loading />;
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
      <div className="min-h-80 overflow-hidden rounded-3xl bg-slate-100">
        <ProductImage
          urls={product.imageUrls}
          name={product.name}
          className="h-full min-h-80 w-full object-cover"
        />
      </div>
      <section>
        <p className="font-semibold uppercase tracking-widest text-brand">
          {product.brand} · {product.sku}
        </p>
        <h1 className="mt-3 text-4xl font-black">{product.name}</h1>
        <p className="mt-5 text-3xl font-black">
          {money(product.price - product.discount)}
        </p>
        <p className="mt-6 leading-7 text-slate-600">{product.description}</p>
        <p className="mt-4 font-semibold">
          {product.stock > 0 ? `${product.stock} available` : "Out of stock"}
        </p>
        {error && (
          <div className="mt-4">
            <Notice message={error} />
          </div>
        )}
        {message && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Notice message={message} tone="success" />
            {message.includes("cart") && (
              <Link
                to="/cart"
                className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
              >
                Go to cart & checkout →
              </Link>
            )}
          </div>
        )}
        <button
          onClick={() => void add()}
          disabled={product.stock === 0}
          className="mt-6 rounded-xl bg-brand px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          Add to cart
        </button>
        {user?.role === "customer" && (
          <button
            onClick={() => void save()}
            className="ml-3 mt-6 rounded-xl border border-brand px-6 py-3 font-semibold text-brand"
          >
            Save to wishlist
          </button>
        )}
        {Object.keys(product.specs).length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold">Specifications</h2>
            <dl className="mt-3 divide-y rounded-xl border bg-white">
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 p-3">
                  <dt className="font-medium">{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <section className="mt-10">
          <h2 className="text-xl font-bold">Customer reviews</h2>
          <p className="mt-1 text-sm text-slate-500">
            {summary.count
              ? `${summary.average.toFixed(1)} / 5 from ${summary.count} reviews`
              : "No reviews yet"}
          </p>
          {user?.role === "customer" && (
            <form
              onSubmit={submitReview}
              className="mt-4 rounded-xl border bg-white p-4"
            >
              <label className="text-sm font-medium">
                Rating
                <select name="rating" className="ml-2 rounded border p-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating}>{rating}</option>
                  ))}
                </select>
              </label>
              <textarea
                required
                minLength={2}
                name="text"
                placeholder="Share your verified experience"
                className="mt-3 w-full rounded-xl border p-3"
              />
              <button className="mt-3 rounded-lg bg-brand px-4 py-2 font-semibold text-white">
                Submit review
              </button>
            </form>
          )}
          <div className="mt-4 space-y-3">
            {reviews.map((review) => (
              <article
                key={review._id}
                className="rounded-xl border bg-white p-4"
              >
                <p className="font-semibold">
                  {"★".repeat(review.rating)}{" "}
                  <span className="text-xs text-brand">Verified purchase</span>
                </p>
                <p className="mt-2 text-sm text-slate-600">{review.text}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
