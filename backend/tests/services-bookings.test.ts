import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { ServiceBookingModel } from "../src/modules/bookings/booking.model.js";
import { UserModel } from "../src/modules/users/user.model.js";

const app = createApp();
let replicaSet: MongoMemoryReplSet;

beforeAll(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replicaSet.getUri());
});
beforeEach(async () => mongoose.connection.dropDatabase());
afterAll(async () => {
  await mongoose.disconnect();
  await replicaSet.stop();
});

async function account(
  email: string,
  role: "customer" | "admin" | "technician" = "customer",
) {
  const password = "Secure123";
  await request(app)
    .post("/api/v1/auth/register")
    .send({ name: `${role} user`, email, password });
  if (role !== "customer") await UserModel.updateOne({ email }, { role });
  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });
  return {
    token: login.body.data.accessToken as string,
    id: login.body.data.user.id as string,
  };
}

async function createService(token: string) {
  const response = await request(app)
    .post("/api/v1/services")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Network installation",
      category: "Networking",
      description: "On-site installation and configuration",
      priceModel: "fixed",
      basePrice: 50_000,
      durationMinutes: 120,
    });
  expect(response.status).toBe(201);
  return response.body.data.service as { _id: string };
}

async function createBooking(token: string, serviceId: string, suffix = "") {
  const response = await request(app)
    .post("/api/v1/bookings")
    .set("Authorization", `Bearer ${token}`)
    .send({
      serviceId,
      preferredStart: new Date(Date.now() + 86_400_000).toISOString(),
      address: `12${suffix} Service Road, Dhaka`,
      customerNotes: "Call before arrival",
    });
  expect(response.status).toBe(201);
  return response.body.data.booking as { _id: string };
}

async function confirmAndAssign(
  bookingId: string,
  adminToken: string,
  technicianId: string,
) {
  const confirmed = await request(app)
    .patch(`/api/v1/bookings/${bookingId}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "confirmed" });
  expect(confirmed.status).toBe(200);
  const assigned = await request(app)
    .patch(`/api/v1/bookings/${bookingId}/assignment`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ technicianId });
  expect(assigned.status).toBe(200);
}

describe("services and bookings", () => {
  it("restricts service mutation to admins and publishes active services", async () => {
    const admin = await account("service-admin@example.com", "admin");
    const customer = await account("service-customer@example.com");
    const denied = await request(app)
      .post("/api/v1/services")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({});
    expect(denied.status).toBe(403);
    await createService(admin.token);
    const listing = await request(app).get("/api/v1/services");
    expect(listing.status).toBe(200);
    expect(listing.body.data.services).toHaveLength(1);
  });

  it("completes the customer-admin-technician workflow with strict scoping", async () => {
    const admin = await account("workflow-admin@example.com", "admin");
    const customer = await account("workflow-customer@example.com");
    const outsider = await account("workflow-outsider@example.com");
    const technician = await account("workflow-tech@example.com", "technician");
    const otherTechnician = await account(
      "workflow-other-tech@example.com",
      "technician",
    );
    const service = await createService(admin.token);
    const booking = await createBooking(customer.token, service._id);

    expect(
      (
        await request(app)
          .get(`/api/v1/bookings/${booking._id}`)
          .set("Authorization", `Bearer ${outsider.token}`)
      ).status,
    ).toBe(404);
    await confirmAndAssign(booking._id, admin.token, technician.id);
    const start = new Date(Date.now() + 172_800_000);
    const scheduled = await request(app)
      .patch(`/api/v1/bookings/${booking._id}/schedule`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ scheduledStart: start.toISOString() });
    expect(scheduled.status).toBe(200);
    expect(
      new Date(scheduled.body.data.booking.scheduledEnd).getTime() -
        start.getTime(),
    ).toBe(120 * 60_000);

    expect(
      (
        await request(app)
          .get(`/api/v1/bookings/${booking._id}`)
          .set("Authorization", `Bearer ${otherTechnician.token}`)
      ).status,
    ).toBe(404);
    const started = await request(app)
      .patch(`/api/v1/bookings/${booking._id}/status`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ status: "in_progress", technicianNotes: "Work started" });
    expect(started.status).toBe(200);
    const completed = await request(app)
      .patch(`/api/v1/bookings/${booking._id}/status`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ status: "completed", technicianNotes: "Installation tested" });
    expect(completed.status).toBe(200);
    const customerView = await request(app)
      .get(`/api/v1/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${customer.token}`);
    expect(customerView.body.data.booking).toMatchObject({
      status: "completed",
      technicianNotes: "Installation tested",
    });
  });

  it("prevents concurrent overlapping schedules for one technician", async () => {
    const admin = await account("overlap-admin@example.com", "admin");
    const firstCustomer = await account("overlap-first@example.com");
    const secondCustomer = await account("overlap-second@example.com");
    const technician = await account("overlap-tech@example.com", "technician");
    const service = await createService(admin.token);
    const [first, second] = await Promise.all([
      createBooking(firstCustomer.token, service._id, "A"),
      createBooking(secondCustomer.token, service._id, "B"),
    ]);
    await confirmAndAssign(first._id, admin.token, technician.id);
    await confirmAndAssign(second._id, admin.token, technician.id);
    const scheduledStart = new Date(Date.now() + 259_200_000).toISOString();
    const results = await Promise.all([
      request(app)
        .patch(`/api/v1/bookings/${first._id}/schedule`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ scheduledStart }),
      request(app)
        .patch(`/api/v1/bookings/${second._id}/schedule`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ scheduledStart }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(
      await ServiceBookingModel.countDocuments({ status: "scheduled" }),
    ).toBe(1);
  });

  it("allows eligible owner cancellation and rejects terminal transitions", async () => {
    const admin = await account("cancel-admin@example.com", "admin");
    const customer = await account("cancel-customer@example.com");
    const service = await createService(admin.token);
    const booking = await createBooking(customer.token, service._id);
    const cancelled = await request(app)
      .post(`/api/v1/bookings/${booking._id}/cancel`)
      .set("Authorization", `Bearer ${customer.token}`);
    expect(cancelled.status).toBe(200);
    expect(
      (
        await request(app)
          .post(`/api/v1/bookings/${booking._id}/cancel`)
          .set("Authorization", `Bearer ${customer.token}`)
      ).status,
    ).toBe(409);
  });
});
