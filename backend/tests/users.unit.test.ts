import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { userRouter } from "../src/modules/users/user.routes.js";
import { errorHandler } from "../src/middleware/error-handler.js";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  updateMany: vi.fn(),
  findUniqueOrThrow: vi.fn(),
}));
vi.mock("../src/config/prisma.js", () => ({ prisma: { user: mocks } }));
vi.mock("../src/config/env.js", () => ({
  env: { JWT_SECRET: "test-secret-for-user-management-only", NODE_ENV: "test" },
}));
const actorId = "10000000-0000-4000-8000-000000000001";
const targetId = "10000000-0000-4000-8000-000000000002";
const target = {
  id: targetId,
  name: "Demo Customer",
  email: "demo@example.test",
  role: "customer",
  isActive: true,
};
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.requestId = "test-request";
  next();
});
app.use("/api/v1/users", userRouter);
app.use(errorHandler);
function token(role = "admin") {
  return jwt.sign({ role }, "test-secret-for-user-management-only", {
    subject: actorId,
    issuer: "itmart-api",
    audience: "itmart-web",
    expiresIn: "15m",
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.findUnique.mockResolvedValue({
    id: actorId,
    role: "admin",
    isActive: true,
  });
  mocks.findMany.mockResolvedValue([target]);
  mocks.count.mockResolvedValue(1);
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.findUniqueOrThrow.mockResolvedValue(target);
});

describe("Admin user API", () => {
  it("omits undefined fields from the Prisma update payload", async () => {
    const { updateUser } = await import("../src/modules/users/user.service.js");
    await updateUser(targetId, {
      name: "Updated name",
      role: undefined,
      isActive: undefined,
    });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: targetId },
      data: { name: "Updated name" },
    });
  });
  it("requires authentication for listing and editing", async () => {
    expect((await request(app).get("/api/v1/users")).status).toBe(401);
    expect(
      (
        await request(app)
          .patch(`/api/v1/users/${targetId}`)
          .send({ name: "Changed" })
      ).status,
    ).toBe(401);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it.each(["customer", "technician"])("denies %s access", async (role) => {
    mocks.findUnique.mockResolvedValue({ id: actorId, role, isActive: true });
    expect(
      (
        await request(app)
          .get("/api/v1/users")
          .auth(token(role), { type: "bearer" })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .patch(`/api/v1/users/${targetId}`)
          .auth(token(role), { type: "bearer" })
          .send({ role: "admin" })
      ).status,
    ).toBe(403);
  });
  it("returns paginated safe profiles and bounded search", async () => {
    const result = await request(app)
      .get("/api/v1/users?q=demo&page=2&limit=10")
      .auth(token(), { type: "bearer" });
    expect(result.status).toBe(200);
    expect(result.body.data.users[0]._id).toBe(targetId);
    expect(result.body.meta).toMatchObject({
      page: 2,
      limit: 10,
      totalItems: 1,
    });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
    );
    expect(JSON.stringify(result.body)).not.toContain("passwordHash");
    expect(
      (
        await request(app)
          .get("/api/v1/users?limit=1000")
          .auth(token(), { type: "bearer" })
      ).status,
    ).toBe(422);
  });
  it("edits allowed fields and atomically protects existing administrators", async () => {
    const result = await request(app)
      .patch(`/api/v1/users/${targetId}`)
      .auth(token(), { type: "bearer" })
      .send({ name: "Technician Name", role: "technician", isActive: false });
    expect(result.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: targetId, role: { not: "admin" } },
      data: { name: "Technician Name", role: "technician", isActive: false },
    });
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const protectedResult = await request(app)
      .patch(`/api/v1/users/${actorId}`)
      .auth(token(), { type: "bearer" })
      .send({ isActive: false });
    expect(protectedResult.status).toBe(409);
    expect(protectedResult.body.error.code).toBe("ADMIN_ACCOUNT_PROTECTED");
  });
  it("returns 404 for an unknown user", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.findUnique
      .mockResolvedValueOnce({ id: actorId, role: "admin", isActive: true })
      .mockResolvedValueOnce(null);
    expect(
      (
        await request(app)
          .patch(`/api/v1/users/${targetId}`)
          .auth(token(), { type: "bearer" })
          .send({ name: "New name" })
      ).status,
    ).toBe(404);
  });
  it.each([
    { passwordHash: "hash" },
    { email: "new@example.test" },
    { role: "owner" },
    { isActive: "false" },
    {},
  ])("rejects invalid or unapproved changes %j", async (payload) => {
    const result = await request(app)
      .patch(`/api/v1/users/${targetId}`)
      .auth(token(), { type: "bearer" })
      .send(payload);
    expect(result.status).toBe(422);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it("rejects malformed user identifiers", async () => {
    expect(
      (
        await request(app)
          .patch("/api/v1/users/bad-id")
          .auth(token(), { type: "bearer" })
          .send({ name: "Name" })
      ).status,
    ).toBe(422);
  });
  it("blocks an inactive account even with an unexpired Admin token", async () => {
    mocks.findUnique.mockResolvedValue({
      id: actorId,
      role: "admin",
      isActive: false,
    });
    const result = await request(app)
      .get("/api/v1/users")
      .auth(token(), { type: "bearer" });
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe("ACCOUNT_INACTIVE");
  });
  it("uses the current role rather than an older token's Admin claim", async () => {
    mocks.findUnique.mockResolvedValue({
      id: actorId,
      role: "customer",
      isActive: true,
    });
    expect(
      (
        await request(app)
          .get("/api/v1/users")
          .auth(token(), { type: "bearer" })
      ).status,
    ).toBe(403);
  });
});
