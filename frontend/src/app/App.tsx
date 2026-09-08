import { useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { AuthForm } from "../features/auth/AuthForm";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { useAuth } from "../features/auth/auth-context";
import { AdminCatalogPage } from "../features/commerce/AdminCatalogPage";
import { CartPage } from "../features/commerce/CartPage";
import { OrdersPage } from "../features/commerce/OrdersPage";
import { ProductDetailPage } from "../features/commerce/ProductDetailPage";
import { ProductListPage } from "../features/commerce/ProductListPage";
import { AdminServicesPage } from "../features/services/AdminServicesPage";
import { BookingsPage } from "../features/services/BookingsPage";
import { ServicesPage } from "../features/services/ServicesPage";
import { AdminBundlesPage } from "../features/release/AdminBundlesPage";
import { BundlesPage } from "../features/release/BundlesPage";
import { ComparePage } from "../features/release/ComparePage";
import { DashboardPage } from "../features/release/DashboardPage";
import { NotificationsPage } from "../features/release/NotificationsPage";
import { ReportsPage } from "../features/release/ReportsPage";
import { OperationsPage } from "../features/release/OperationsPage";
import { WishlistPage } from "../features/release/WishlistPage";
import { BusinessAccountsPage } from "../features/future/BusinessAccountsPage";
import { FutureFeaturesPage } from "../features/future/FutureFeaturesPage";
import { LandingPage } from "./LandingPage";
import { SupportPage } from "../features/support/SupportPage";
import { PaymentResultPage } from "../features/commerce/PaymentResultPage";

function Header() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const primaryLinks = [
    { to: "/products", label: "Products" },
    { to: "/services", label: "Services" },
    { to: "/bundles", label: "Bundles" },
    ...(user ? [{ to: "/solutions", label: "Solutions" }] : []),
  ];
  const accountLinks = user
    ? [
        { to: "/dashboard", label: "Dashboard" },
        ...(user.role === "customer"
          ? [
              { to: "/cart", label: "Cart" },
              { to: "/wishlist", label: "Wishlist" },
            ]
          : []),
        ...(user.role !== "technician"
          ? [{ to: "/orders", label: "Orders" }]
          : []),
        {
          to: "/bookings",
          label: user.role === "technician" ? "My jobs" : "Bookings",
        },
        { to: "/notifications", label: "Notifications" },
        ...(user.role !== "technician"
          ? [{ to: "/support", label: "Support" }]
          : []),
        ...(user.role === "admin"
          ? [
              { to: "/admin/catalog", label: "Admin catalog" },
              { to: "/admin/services", label: "Manage services" },
              { to: "/admin/bundles", label: "Manage bundles" },
              { to: "/admin/reports", label: "Reports" },
              { to: "/admin/operations", label: "Operations" },
            ]
          : []),
      ]
    : [];
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-2 text-sm font-bold transition ${isActive ? "bg-emerald-50 text-brand" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`;
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_1px_18px_rgba(15,23,42,.04)] backdrop-blur-xl">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-[74px] max-w-7xl items-center justify-between gap-5 px-4"
      >
        <Link
          to="/"
          className="group flex items-center gap-2.5"
          aria-label="ITMart home"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition group-hover:bg-brand">
            IT
          </span>
          <span className="text-xl font-black tracking-[-.04em] text-slate-950">
            IT<span className="text-brand">MART</span>
          </span>
        </Link>
        <div className="hidden items-center gap-1 lg:flex">
          {primaryLinks.map((link) => (
            <NavLink key={link.to} className={navClass} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              {user.role === "customer" && (
                <>
                  <NavLink to="/cart" className={navClass}>
                    Cart
                  </NavLink>
                  <NavLink to="/orders" className={navClass}>
                    Orders
                  </NavLink>
                </>
              )}
              {user.role === "admin" && (
                <NavLink to="/orders" className={navClass}>
                  Orders
                </NavLink>
              )}
              <Link
                to="/dashboard"
                className="flex items-center gap-3 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 shadow-sm transition hover:border-emerald-200"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-xs font-black uppercase text-emerald-800">
                  {user.name.slice(0, 2)}
                </span>
                <span className="text-left">
                  <span className="block max-w-32 truncate text-xs font-black text-slate-900">
                    {user.name}
                  </span>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {user.role}
                  </span>
                </span>
              </Link>
              <button
                onClick={signOut}
                className="rounded-full px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-700"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-brand"
              >
                Create account
              </Link>
            </>
          )}
        </div>
        <button
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-900 lg:hidden"
          aria-label="Toggle navigation"
        >
          <span className="space-y-1.5">
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
          </span>
        </button>
      </nav>
      {open && (
        <div
          id="mobile-navigation"
          className="border-t border-slate-100 bg-white px-4 pb-5 pt-4 lg:hidden"
        >
          <div className="mx-auto grid max-w-7xl gap-1">
            {[...primaryLinks, ...accountLinks].map((link) => (
              <NavLink
                onClick={() => setOpen(false)}
                key={link.to}
                className={navClass}
                to={link.to}
              >
                {link.label}
              </NavLink>
            ))}
            {user ? (
              <button
                onClick={() => {
                  signOut();
                  setOpen(false);
                }}
                className="mt-2 rounded-xl border border-red-100 px-4 py-3 text-left text-sm font-bold text-red-700"
              >
                Sign out
              </button>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  onClick={() => setOpen(false)}
                  to="/login"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-black"
                >
                  Sign in
                </Link>
                <Link
                  onClick={() => setOpen(false)}
                  to="/register"
                  className="rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Forbidden() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-4xl font-bold">Access denied</h1>
      <p className="mt-3 text-slate-600">
        Your account does not have permission to view this page.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-block font-semibold text-brand"
      >
        Return to dashboard
      </Link>
    </main>
  );
}
function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-4xl font-bold">Page not found</h1>
      <Link to="/" className="mt-6 inline-block font-semibold text-brand">
        Return home
      </Link>
    </main>
  );
}

export function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthForm mode="login" />} />
        <Route path="/register" element={<AuthForm mode="register" />} />
        <Route path="/payment-result" element={<PaymentResultPage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/bundles" element={<BundlesPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route
          path="/solutions"
          element={
            <ProtectedRoute roles={["customer", "admin"]}>
              <FutureFeaturesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute roles={["customer"]}>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute roles={["customer", "admin"]}>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute roles={["customer", "technician", "admin"]}>
              <BookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute roles={["customer"]}>
              <WishlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute roles={["customer", "admin"]}>
              <SupportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/catalog"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminCatalogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bundles"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminBundlesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute roles={["admin"]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/operations"
          element={
            <ProtectedRoute roles={["admin"]}>
              <OperationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/business-accounts"
          element={
            <ProtectedRoute roles={["admin"]}>
              <BusinessAccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminServicesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
