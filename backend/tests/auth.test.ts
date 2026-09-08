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

describe("authentication", () => {
  const validUser = {
    name: "Demo Customer",
    email: "DEMO@example.com",
    password: "Secure123",
  };

  it("registers only a customer and never exposes passwordHash", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validUser });

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({
      email: "demo@example.com",
      role: "customer",
    });
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    expect(response.body.data.accessToken).toEqual(expect.any(String));
  });

  it("rejects attempts to submit an elevated role", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validUser, role: "admin" });

    expect(response.status).toBe(422);
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects duplicate email addresses", async () => {
    await request(app).post("/api/v1/auth/register").send(validUser);
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(validUser);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_IN_USE");
  });

  it("logs in and resolves the current user", async () => {
    await request(app).post("/api/v1/auth/register").send(validUser);
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: validUser.email, password: validUser.password });
    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`);

    expect(login.status).toBe(200);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe("demo@example.com");
  });

  it("returns 401 for invalid credentials and protected access", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "missing@example.com", password: "Incorrect1" });
    const me = await request(app).get("/api/v1/auth/me");

    expect(login.status).toBe(401);
    expect(me.status).toBe(401);
  });
});