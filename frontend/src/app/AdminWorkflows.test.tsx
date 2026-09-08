import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/client";
import { BookingsPage } from "../features/services/BookingsPage";
import { AdminCatalogPage } from "../features/commerce/AdminCatalogPage";
import { AdminServicesPage } from "../features/services/AdminServicesPage";
import { AdminBundlesPage } from "../features/release/AdminBundlesPage";
import { OrdersPage } from "../features/commerce/OrdersPage";
import { CartPage } from "../features/commerce/CartPage";
import { App } from "./App";

const auth = vi.hoisted(() => ({
  user: { id: "admin", name: "Admin User", role: "admin" },
  isLoading: false,
  signOut: vi.fn(),
}));
vi.mock("../features/auth/auth-context", () => ({ useAuth: () => auth }));
vi.mock("../api/client", () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
const product = {
  _id: "product-1",
  name: "Test laptop",
  sku: "LAP-1",
  brand: "Nova",
  categoryId: "category-1",
  price: 10000,
  discount: 500,
  stock: 4,
  description: "A test laptop",
  warranty: "One year",
  imageUrls: [],
  tags: [],
  specs: {},
  status: "active",
};
const service = {
  _id: "service-1",
  name: "Device repair",
  category: "Repair",
  description: "Diagnose device",
  priceModel: "fixed",
  basePrice: 5000,
  durationMinutes: 60,
  isActive: true,
};
const bundle = {
  _id: "bundle-1",
  name: "Office bundle",
  description: "Office equipment",
  bundlePrice: 15000,
  productItems: [{ productId: product, quantity: 2 }],
  serviceIds: [service],
  isActive: true,
};
const envelope = (data: object) => ({
  data: { success: true, data, meta: { totalPages: 1 } },
});
function show(element: React.ReactNode) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}
beforeEach(() => {
  vi.clearAllMocks();
  auth.user.role = "admin";
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === "/categories")
      return envelope({
        categories: [
          {
            _id: "category-1",
            name: "Laptops",
            slug: "laptops",
            description: "Computers",
          },
        ],
      });
    if (url === "/products") return envelope({ products: [product] });
    if (url === "/services") return envelope({ services: [service] });
    if (url === "/bundles") return envelope({ bundles: [bundle] });
    if (url === "/users")
      return envelope({
        users: [
          {
            _id: "customer-1",
            name: "Customer One",
            email: "demo@example.test",
            role: "customer",
            isActive: true,
          },
        ],
      });
    return envelope({});
  });
  vi.mocked(apiClient.patch).mockResolvedValue(envelope({}));
});

describe("Admin workflows", () => {
  it("includes the selected delivery fee in the checkout estimate", async () => {
    auth.user.role = "customer";
    vi.mocked(apiClient.get).mockResolvedValue(
      envelope({
        cart: {
          items: [
            {
              productId: { ...product, price: 285000, discount: 0 },
              quantity: 1,
            },
          ],
          bundleItems: [],
        },
      }),
    );
    show(<CartPage />);
    expect(await screen.findByText(/2,930/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Delivery"), "express");
    expect(screen.getByText(/3,030/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Delivery"), "pickup");
    expect(screen.queryByText(/3,030/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/2,850/).length).toBeGreaterThan(0);
  });
  it("confirms an unassigned booking without crashing and allows assignment", async () => {
    let confirmed = false;
    vi.mocked(apiClient.get).mockImplementation(async (url) =>
      url === "/users/technicians"
        ? envelope({ technicians: [{ _id: "tech-1", name: "Technician One" }] })
        : envelope({
            bookings: [
              {
                _id: "booking-1",
                bookingNumber: "BOOK-1",
                serviceNameSnapshot: "Repair",
                basePriceSnapshot: 100,
                durationMinutesSnapshot: 60,
                address: "Test address",
                status: confirmed ? "confirmed" : "requested",
                technicianId: null,
              },
            ],
          }),
    );
    vi.mocked(apiClient.patch).mockImplementation(async () => {
      confirmed = true;
      return envelope({ booking: {} });
    });
    show(<BookingsPage />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Confirm" }),
    );
    const select = await screen.findByLabelText("Assign technician for BOOK-1");
    expect(select).toHaveValue("");
    await userEvent.selectOptions(select, "tech-1");
    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith(
        "/bookings/booking-1/assignment",
        { technicianId: "tech-1" },
      ),
    );
  });

  it("edits product price in BDT without overwriting other catalog fields", async () => {
    show(<AdminCatalogPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    await userEvent.clear(screen.getByLabelText("Price (BDT)"));
    await userEvent.type(screen.getByLabelText("Price (BDT)"), "120.50");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith(
        "/products/product-1",
        expect.objectContaining({ price: 12050, discount: 500, stock: 4 }),
      ),
    );
    expect(vi.mocked(apiClient.patch).mock.calls[0][1]).not.toHaveProperty(
      "specs",
    );
  });

  it("edits service duration", async () => {
    show(<AdminServicesPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    await userEvent.clear(screen.getByLabelText("Duration (minutes)"));
    await userEvent.type(screen.getByLabelText("Duration (minutes)"), "90");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith(
        "/services/service-1",
        expect.objectContaining({ durationMinutes: 90 }),
      ),
    );
  });

  it("edits bundle details while preserving its multiple components", async () => {
    show(<AdminBundlesPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    await userEvent.clear(screen.getByLabelText("Bundle name"));
    await userEvent.type(
      screen.getByLabelText("Bundle name"),
      "Updated office bundle",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith("/bundles/bundle-1", {
        name: "Updated office bundle",
        description: bundle.description,
        bundlePrice: bundle.bundlePrice,
      }),
    );
  });

  it("shows user management in Admin navigation and saves access changes", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("navigation", { name: "Admin navigation" }),
    ).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    await userEvent.selectOptions(screen.getByLabelText("Role"), "technician");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith("/users/customer-1", {
        name: "Customer One",
        role: "technician",
        isActive: true,
      }),
    );
  });

  it("offers fulfilment updates for open orders and explains closed orders", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      envelope({
        orders: ["processing", "cancelled"].map((status) => ({
          _id: status,
          orderNumber: status,
          status,
          items: [],
          statusHistory: [],
          grandTotal: 1000,
          returnRequests: [],
          carrier: "Courier",
          trackingNumber: "TRACK-1",
        })),
      }),
    );
    show(<OrdersPage />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Update order" }),
    );
    expect(
      screen.getByText(/cancelled and closed to changes/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Tracking number")).toBeRequired();
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith(
        "/orders/processing/status",
        expect.objectContaining({
          status: "shipped",
          trackingNumber: "TRACK-1",
          carrier: "Courier",
        }),
      ),
    );
  });

  it("hides Admin navigation and denies user management to customers", async () => {
    auth.user.role = "customer";
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole("navigation", { name: "Admin navigation" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Access denied" }),
    ).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
