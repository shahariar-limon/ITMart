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

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function account(
  email: string,
  role: "customer" | "admin" | "technician" = "customer",
) {
  const password = "Secure123";
  await request(app)
    .post("/api/v1/auth/register")
    .send({ name: `${role} User`, email, password });
  if (role !== "customer") {
    await prisma.user.update({ where: { email }, data: { role } });
  }
  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });
  return {
    token: login.body.data.accessToken as string,
    userId: login.body.data.user.id as string,
  };
}

async function seedProduct(_customerId: string) {
  const category = await prisma.category.create({
    data: { name: "Networking", slug: `networking-${randomUUID()}` },
  });
  return prisma.product.create({
    data: {
      name: "Managed Router",
      sku: `RTR-${randomUUID()}`,
      categoryId: category.id,
      brand: "NetCo",
      description: "Business router",
      price: 10_000,
      discount: 1_000,
      stock: 5,
      tags: ["router"],
      imageUrls: [],
      specs: { ports: "8" },
      warranty: "1 year",
    },
  });
}

async function seedOrder(customerId: string) {
  return prisma.order.create({
    data: {
      orderNumber: `ITM-${randomUUID().slice(0, 8).toUpperCase()}`,
      userId: customerId,
      subtotal: 10_000,
      discountTotal: 0,
      grandTotal: 10_080,
      shippingAddress: "12 Support Road, Dhaka",
      idempotencyKey: randomUUID(),
    },
  });
}

describe("customer support workflow", () => {
  it("lets customers create tickets linked to their order or product and hides others", async () => {
    const customer = await account("support-customer@example.com");
    const other = await account("support-other@example.com");
    const admin = await account("support-admin@example.com", "admin");

    const product = await seedProduct(customer.userId);
    const order = await seedOrder(customer.userId);
    const othersOrder = await seedOrder(other.userId);

    const linked = await request(app)
      .post("/api/v1/support")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        subject: "Router power light off",
        description: "The power LED on this router stays dark.",
        priority: "high",
        orderId: order.id,
        productId: product.id,
      });
    expect(linked.status).toBe(201);
    expect(linked.body.data.ticket).toMatchObject({
      status: "open",
      priority: "high",
      orderId: order.id,
      productId: product.id,
    });

    const foreignLink = await request(app)
      .post("/api/v1/support")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        subject: "Wrong order linked",
        description: "Trying to attach someone else's order ticket.",
        orderId: othersOrder.id,
      });
    expect(foreignLink.status).toBe(404);

    const ownList = await request(app)
      .get("/api/v1/support")
      .set("Authorization", `Bearer ${customer.token}`);
    expect(ownList.status).toBe(200);
    expect(ownList.body.data.tickets).toHaveLength(1);
    expect(ownList.body.data.tickets[0]._id).toBe(linked.body.data.ticket._id);

    const otherList = await request(app)
      .get("/api/v1/support")
      .set("Authorization", `Bearer ${other.token}`);
    expect(otherList.body.data.tickets).toHaveLength(0);

    const adminList = await request(app)
      .get("/api/v1/support")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(adminList.body.data.tickets).toHaveLength(1);

    const hiddenFromOther = await request(app)
      .get(`/api/v1/support/${linked.body.data.ticket._id}`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(hiddenFromOther.status).toBe(404);
  });

  it("enforces role guards and validates assignee as active staff", async () => {
    const customer = await account("guard-customer@example.com");
    const technician = await account("guard-technician@example.com", "technician");
    const admin = await account("guard-admin@example.com", "admin");

    const anonymous = await request(app).post("/api/v1/support").send({
      subject: "Anonymous ticket request",
      description: "This should be rejected before any business logic.",
    });
    expect(anonymous.status).toBe(401);

    const asTechnician = await request(app)
      .post("/api/v1/support")
      .set("Authorization", `Bearer ${technician.token}`)
      .send({
        subject: "Technician tries to report",
        description: "Only customers may open support tickets.",
      });
    expect(asTechnician.status).toBe(403);

    const created = await request(app)
      .post("/api/v1/support")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        subject: "Need help configuring email",
        description: "I cannot deliver outbound mail from my new PC.",
      });
    expect(created.status).toBe(201);

    const customerUpdate = await request(app)
      .patch(`/api/v1/support/${created.body.data.ticket._id}`)
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ status: "resolved" });
    expect(customerUpdate.status).toBe(403);

    const invalidAssignee = await request(app)
      .patch(`/api/v1/support/${created.body.data.ticket._id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ assigneeId: customer.userId });
    expect(invalidAssignee.status).toBe(422);

    const assigned = await request(app)
      .patch(`/api/v1/support/${created.body.data.ticket._id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ assigneeId: technician.userId, status: "in_progress" });
    expect(assigned.status).toBe(200);
    expect(assigned.body.data.ticket).toMatchObject({
      assigneeId: technician.userId,
      status: "in_progress",
    });
  });

  it("marks first response and resolution, and keeps internal notes admin-scoped", async () => {
    const customer = await account("notes-customer@example.com");
    const technician = await account("notes-technician@example.com", "technician");
    const admin = await account("notes-admin@example.com", "admin");

    const created = await request(app)
      .post("/api/v1/support")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        subject: "Customer internal note visibility",
        description: "Internal support notes must never leak to customers.",
      });
    const ticketId = created.body.data.ticket._id as string;

    const customerDenied = await request(app)
      .post(`/api/v1/support/${ticketId}/replies`)
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ message: "Marking my own issue internal.", internal: true });
    expect(customerDenied.status).toBe(403);

    const adminReply = await request(app)
      .post(`/api/v1/support/${ticketId}/replies`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ message: "We are investigating the power LED issue." });
    expect(adminReply.status).toBe(201);
    expect(adminReply.body.data.ticket.firstResponseAt).toBeTruthy();

    const internalNote = await request(app)
      .post(`/api/v1/support/${ticketId}/replies`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ message: "Suspect faulty PSU batch; keep quiet.", internal: true });
    expect(internalNote.status).toBe(201);

    const customerView = await request(app)
      .get(`/api/v1/support/${ticketId}`)
      .set("Authorization", `Bearer ${customer.token}`);
    expect(customerView.body.data.ticket.replies.map((r: { internal: boolean }) => r.internal)).toEqual(
      [false],
    );

    const adminView = await request(app)
      .get(`/api/v1/support/${ticketId}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(adminView.body.data.ticket.replies.map((r: { internal: boolean }) => r.internal)).toEqual(
      [false, true],
    );

    const customerFollowUp = await request(app)
      .post(`/api/v1/support/${ticketId}/replies`)
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ message: "Appreciated, waiting for the outcome." });
    expect(customerFollowUp.status).toBe(201);

    const resolved = await request(app)
      .patch(`/api/v1/support/${ticketId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "resolved", assigneeId: technician.userId });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.ticket).toMatchObject({
      status: "resolved",
      resolvedAt: expect.any(String),
    });
  });
});