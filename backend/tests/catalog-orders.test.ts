import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { UserModel } from "../src/modules/users/user.model.js";
import { ProductModel } from "../src/modules/products/product.model.js";
import { OrderModel } from "../src/modules/orders/order.model.js";

const app = createApp();
let replicaSet: MongoMemoryReplSet;

beforeAll(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replicaSet.getUri());
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replicaSet.stop();
});

async function account(email: string, role: "customer" | "admin" = "customer") {
  const password = "Secure123";
  await request(app)
    .post("/api/v1/auth/register")
    .send({
      name: role === "admin" ? "Admin User" : "Customer User",
      email,
      password,
    });
  if (role === "admin") await UserModel.updateOne({ email }, { role });
  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });
  return {
    token: login.body.data.accessToken as string,
    userId: login.body.data.user.id as string,
  };
}

async function seedProduct(
  adminToken: string,
  overrides: Record<string, unknown> = {},
) {
  const categoryResponse = await request(app)
    .post("/api/v1/categories")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: `Networking ${Math.random()}`,
      slug: `networking-${Math.random().toString(36).slice(2)}`,
      description: "Network products",
    });
  const response = await request(app)
    .post("/api/v1/products")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "Managed Router",
      sku: `RTR-${Math.random().toString(36).slice(2)}`,
      categoryId: categoryResponse.body.data.category._id,
      brand: "NetCo",
      description: "Business router",
      price: 10_000,
      discount: 1_000,
      stock: 5,
      tags: ["router"],
      imageUrls: [],
      specs: { ports: "8" },
      warranty: "1 year",
      ...overrides,
    });
  expect(response.status).toBe(201);
  return response.body.data.product as { _id: string; categoryId: string };
}

describe("catalog", () => {
  it("allows only admins to mutate and exposes active paginated products", async () => {
    const admin = await account("admin@example.com", "admin");
    const customer = await account("customer@example.com");
    const denied = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ name: "Servers", slug: "servers" });
    expect(denied.status).toBe(403);

    const product = await seedProduct(admin.token);
    const listing = await request(app)
      .get("/api/v1/products")
      .query({ brand: "NetCo", available: true, page: 1, limit: 10 });
    expect(listing.status).toBe(200);
    expect(listing.body.data.products).toHaveLength(1);
    expect(listing.body.meta).toMatchObject({
      page: 1,
      limit: 10,
      totalItems: 1,
      totalPages: 1,
    });

    await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    const hidden = await request(app).get(`/api/v1/products/${product._id}`);
    expect(hidden.status).toBe(404);
  });

  it("validates filter ranges and category references", async () => {
    const admin = await account("admin2@example.com", "admin");
    const invalidRange = await request(app)
      .get("/api/v1/products")
      .query({ minPrice: 100, maxPrice: 50 });
    const invalidCategory = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Bad Product",
        sku: "BAD-1",
        categoryId: new mongoose.Types.ObjectId().toString(),
        brand: "Brand",
        description: "No category",
        price: 100,
        stock: 1,
      });
    expect(invalidRange.status).toBe(422);
    expect(invalidCategory.status).toBe(422);
  });
});

describe("cart, checkout, and orders", () => {
  it("uses authoritative prices, decrements stock, scopes access, and restores once", async () => {
    const admin = await account("order-admin@example.com", "admin");
    const customer = await account("buyer@example.com");
    const outsider = await account("outsider@example.com");
    const product = await seedProduct(admin.token, { stock: 3 });

    await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ productId: product._id, quantity: 2 });
    const checkout = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        shippingAddress: "12 Example Road, Dhaka",
        paymentMethod: "cod",
        total: 1,
      });
    expect(checkout.status).toBe(201);
    expect(checkout.body.data.order).toMatchObject({
      subtotal: 20_000,
      discountTotal: 2_000,
      grandTotal: 18_000,
      status: "pending",
    });
    expect(checkout.body.data.order.items[0]).toMatchObject({
      unitPrice: 9_000,
      quantity: 2,
      lineTotal: 18_000,
    });
    expect((await ProductModel.findById(product._id))?.stock).toBe(1);

    const orderId = checkout.body.data.order._id as string;
    expect(
      (
        await request(app)
          .get(`/api/v1/orders/${orderId}`)
          .set("Authorization", `Bearer ${outsider.token}`)
      ).status,
    ).toBe(404);
    const cancelled = await request(app)
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set("Authorization", `Bearer ${customer.token}`);
    expect(cancelled.status).toBe(200);
    expect((await ProductModel.findById(product._id))?.stock).toBe(3);
    expect(
      (
        await request(app)
          .post(`/api/v1/orders/${orderId}/cancel`)
          .set("Authorization", `Bearer ${customer.token}`)
      ).status,
    ).toBe(409);
    expect((await ProductModel.findById(product._id))?.stock).toBe(3);
  });

  it("prevents overselling during concurrent checkout", async () => {
    const admin = await account("stock-admin@example.com", "admin");
    const first = await account("first@example.com");
    const second = await account("second@example.com");
    const product = await seedProduct(admin.token, { stock: 1, discount: 0 });
    await Promise.all([
      request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${first.token}`)
        .send({ productId: product._id, quantity: 1 }),
      request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${second.token}`)
        .send({ productId: product._id, quantity: 1 }),
    ]);
    const results = await Promise.all([
      request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${first.token}`)
        .send({ shippingAddress: "12 First Road, Dhaka" }),
      request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${second.token}`)
        .send({ shippingAddress: "34 Second Road, Dhaka" }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect((await ProductModel.findById(product._id))?.stock).toBe(0);
    expect(await OrderModel.countDocuments()).toBe(1);
  });

  it("rejects invalid status transitions", async () => {
    const admin = await account("transition-admin@example.com", "admin");
    const customer = await account("transition-buyer@example.com");
    const product = await seedProduct(admin.token);
    await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ productId: product._id, quantity: 1 });
    const checkout = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ shippingAddress: "45 Transition Road, Dhaka" });
    const response = await request(app)
      .patch(`/api/v1/orders/${checkout.body.data.order._id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "shipped" });
    expect(response.status).toBe(409);
  });
});
