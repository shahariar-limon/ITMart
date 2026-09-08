import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { resetDb } from "./helpers/db.js";

const app = createApp();
beforeAll(async () => {
  await prisma.$connect();
});
beforeEach(async () => resetDb());
afterAll(async () => {
  await prisma.$disconnect();
});

async function account(email: string, role: "customer" | "admin" = "customer") {
  const password = "Secure123";
  await request(app)
    .post("/api/v1/auth/register")
    .send({ name: `${role} user`, email, password });
  if (role === "admin") {
    await prisma.user.update({ where: { email }, data: { role } });
  }
  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });
  return {
    token: login.body.data.accessToken as string,
    id: login.body.data.user.id as string,
  };
}

async function catalog(adminToken: string) {
  const category = await request(app)
    .post("/api/v1/categories")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "Security",
      slug: "security",
      description: "Security equipment",
    });
  const product = await request(app)
    .post("/api/v1/products")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "IP Camera",
      sku: "CAM-1",
      categoryId: category.body.data.category._id,
      brand: "Vision",
      description: "Outdoor camera",
      price: 12_000,
      discount: 2_000,
      stock: 4,
    });
  const service = await request(app)
    .post("/api/v1/services")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "Camera installation",
      category: "Security",
      description: "Install and configure camera",
      priceModel: "fixed",
      basePrice: 5_000,
      durationMinutes: 60,
    });
  return {
    product: product.body.data.product as { _id: string },
    service: service.body.data.service as { _id: string },
  };
}

describe("dashboard and release modules", () => {
  it("protects dashboard and reports while returning operational metrics and CSV", async () => {
    const admin = await account("metrics-admin@example.com", "admin");
    const customer = await account("metrics-customer@example.com");
    await catalog(admin.token);
    expect(
      (
        await request(app)
          .get("/api/v1/admin/dashboard")
          .set("Authorization", `Bearer ${customer.token}`)
      ).status,
    ).toBe(403);
    const dashboard = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.metrics).toMatchObject({
      activeProducts: 1,
      customers: 1,
      totalOrders: 0,
    });
    const csv = await request(app)
      .get("/api/v1/reports/sales.csv")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(csv.status).toBe(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.text).toContain("Order Number");
  });

  it("enforces completed-purchase reviews and user-scoped wishlists", async () => {
    const admin = await account("review-admin@example.com", "admin");
    const customer = await account("review-customer@example.com");
    const outsider = await account("review-outsider@example.com");
    const { product } = await catalog(admin.token);
    const denied = await request(app)
      .post(`/api/v1/products/${product._id}/reviews`)
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ rating: 5, text: "Excellent camera" });
    expect(denied.status).toBe(403);
    await prisma.order.create({
      data: {
        orderNumber: "ITM-REVIEW-1",
        userId: customer.id,
        subtotal: 12_000,
        discountTotal: 2_000,
        grandTotal: 10_000,
        idempotencyKey: "itm-review-1",
        shippingAddress: "12 Review Road, Dhaka",
        status: "completed",
        items: {
          create: [
            {
              productId: product._id,
              nameSnapshot: "IP Camera",
              skuSnapshot: "CAM-1",
              quantity: 1,
              unitPrice: 10_000,
              lineTotal: 10_000,
            },
          ],
        },
        statusHistory: {
          create: { from: "delivered", to: "completed", changedBy: admin.id },
        },
      },
    });
    const created = await request(app)
      .post(`/api/v1/products/${product._id}/reviews`)
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ rating: 5, text: "Excellent camera" });
    expect(created.status).toBe(201);
    expect(created.body.data.review.verifiedPurchase).toBe(true);
    await request(app)
      .post("/api/v1/wishlist/items")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ productId: product._id });
    const own = await request(app)
      .get("/api/v1/wishlist")
      .set("Authorization", `Bearer ${customer.token}`);
    const other = await request(app)
      .get("/api/v1/wishlist")
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(own.body.data.wishlist.productIds).toHaveLength(1);
    expect(other.body.data.wishlist.productIds).toHaveLength(0);
  });

  it("purchases product-service bundles transactionally and creates service work", async () => {
    const admin = await account("bundle-admin@example.com", "admin");
    const customer = await account("bundle-customer@example.com");
    const { product, service } = await catalog(admin.token);
    const bundle = await request(app)
      .post("/api/v1/bundles")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Camera starter kit",
        description: "Camera with installation",
        productItems: [{ productId: product._id, quantity: 2 }],
        serviceIds: [service._id],
        bundlePrice: 22_000,
      });
    expect(bundle.status).toBe(201);
    const added = await request(app)
      .post("/api/v1/cart/bundles")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ bundleId: bundle.body.data.bundle._id, quantity: 1 });
    expect(added.status).toBe(201);
    const checkout = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ shippingAddress: "12 Bundle Road, Dhaka", idempotencyKey: randomUUID() });
    expect(checkout.status).toBe(201);
    expect(checkout.body.data.order).toMatchObject({ grandTotal: 30_000 });
    expect(checkout.body.data.order.bundleItems).toHaveLength(1);
    expect((await prisma.product.findUnique({ where: { id: product._id } }))?.stock).toBe(2);
    expect(
      await prisma.serviceBooking.count({
        where: { userId: customer.id, status: "requested" },
      }),
    ).toBe(1);
    const notifications = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${customer.token}`);
    expect(notifications.body.data.unreadCount).toBeGreaterThan(0);
  });

  it("applies server-controlled business pricing and simulated authorization", async () => {
    const admin = await account("business-admin@example.com", "admin");
    const customer = await account("business-customer@example.com");
    const { product } = await catalog(admin.token);
    await prisma.product.update({
      where: { id: product._id },
      data: { stock: 20 },
    });
    const upgraded = await request(app)
      .patch(`/api/v1/users/${customer.id}/business-account`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ accountType: "business", businessDiscountBps: 500 });
    expect(upgraded.status).toBe(200);
    await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ productId: product._id, quantity: 10 });
    const checkout = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        shippingAddress: "12 Business Road, Dhaka",
        paymentMethod: "simulated",
        idempotencyKey: randomUUID(),
      });
    expect(checkout.status).toBe(201);
    expect(checkout.body.data.order).toMatchObject({
      grandTotal: 103_000,
      paymentStatus: "authorized",
      paymentMethod: "simulated",
    });
    expect(checkout.body.data.order.paymentReference).toMatch(/^SIM-/);
  });

  it("converts an accepted quote", async () => {
    const admin = await account("quote-admin@example.com", "admin");
    const customer = await account("quote-customer@example.com");
    const { product, service } = await catalog(admin.token);
    const submitted = await request(app)
      .post("/api/v1/solutions")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        title: "Office camera system",
        requirements: "Install a camera system for our office entrance.",
      });
    expect(submitted.status).toBe(201);
    const quoted = await request(app)
      .patch(`/api/v1/solutions/${submitted.body.data.solution._id}/quote`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        productItems: [{ productId: product._id, quantity: 1 }],
        serviceIds: [service._id],
        quotedPrice: 15_000,
        adminNotes: "Includes installation",
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      });
    expect(quoted.status).toBe(200);
    const accepted = await request(app)
      .post(`/api/v1/solutions/${submitted.body.data.solution._id}/decision`)
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        decision: "accept",
        shippingAddress: "12 Quotation Road, Dhaka",
      });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.order.grandTotal).toBe(15_000);
    expect((await prisma.product.findUnique({ where: { id: product._id } }))?.stock).toBe(3);
    expect(
      await prisma.serviceBooking.count({
        where: { userId: customer.id },
      }),
    ).toBe(1);
  });
});
