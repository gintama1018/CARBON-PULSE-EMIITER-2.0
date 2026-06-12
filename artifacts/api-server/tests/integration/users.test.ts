import { describe, it, expect, afterAll, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const TEST_USER = `test-users-${Date.now()}`;

afterAll(async () => {
  await db.delete(usersTable).where(eq(usersTable.id, TEST_USER));
});

describe("GET /api/users/me", () => {
  it("auto-creates a new user on first visit and returns 200", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("x-user-id", TEST_USER);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", TEST_USER);
  });

  it("returns the same user on second visit (idempotent)", async () => {
    const res1 = await request(app)
      .get("/api/users/me")
      .set("x-user-id", TEST_USER);
    const res2 = await request(app)
      .get("/api/users/me")
      .set("x-user-id", TEST_USER);

    expect(res1.body.id).toBe(res2.body.id);
    expect(res1.body.email).toBe(res2.body.email);
  });

  it("user has required fields (id, email, region, weeklyBudgetKg)", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("x-user-id", TEST_USER);

    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("email");
    expect(res.body).toHaveProperty("region");
    expect(res.body).toHaveProperty("weeklyBudgetKg");
  });

  it("returns 401 when no x-user-id header is provided", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });
});

describe("PATCH /api/users/me", () => {
  beforeAll(async () => {
    await request(app)
      .get("/api/users/me")
      .set("x-user-id", TEST_USER);
  });

  it("updates displayName and returns updated user", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("x-user-id", TEST_USER)
      .send({ displayName: "Updated Test User" });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe("Updated Test User");
  });

  it("updates weeklyBudgetKg", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("x-user-id", TEST_USER)
      .send({ weeklyBudgetKg: 75 });

    expect(res.status).toBe(200);
    expect(res.body.weeklyBudgetKg).toBe(75);
  });

  it("rejects invalid weeklyBudgetKg (negative)", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("x-user-id", TEST_USER)
      .send({ weeklyBudgetKg: -10 });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/users/me", () => {
  const POST_USER = `test-users-post-${Date.now()}`;

  afterAll(async () => {
    await db.delete(usersTable).where(eq(usersTable.id, POST_USER));
  });

  it("creates a new user with provided fields", async () => {
    const res = await request(app)
      .post("/api/users/me")
      .set("x-user-id", POST_USER)
      .send({ displayName: "Post User", region: "EU" });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe("Post User");
    expect(res.body.region).toBe("EU");
  });

  it("upserts an existing user (does not duplicate)", async () => {
    await request(app)
      .post("/api/users/me")
      .set("x-user-id", POST_USER)
      .send({ displayName: "Updated Again" });

    const count = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, POST_USER));
    expect(count.length).toBe(1);
  });
});
