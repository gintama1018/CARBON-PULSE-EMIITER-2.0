import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { db, goalsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const TEST_USER = `test-goals-${Date.now()}`;

beforeAll(async () => {
  await request(app).get("/api/users/me").set("x-user-id", TEST_USER);
});

afterAll(async () => {
  await db.delete(goalsTable).where(eq(goalsTable.userId, TEST_USER));
  await db.delete(usersTable).where(eq(usersTable.id, TEST_USER));
});

describe("POST /api/goals", () => {
  it("creates a goal and returns 201 with the goal data", async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("x-user-id", TEST_USER)
      .send({ targetKgPerWeek: 80 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.targetKgPerWeek).toBe(80);
    expect(res.body.isActive).toBe(true);
  });

  it("deactivates the previous active goal when creating a new one", async () => {
    await request(app)
      .post("/api/goals")
      .set("x-user-id", TEST_USER)
      .send({ targetKgPerWeek: 60 });

    const goals = await db
      .select()
      .from(goalsTable)
      .where(eq(goalsTable.userId, TEST_USER));

    const activeGoals = goals.filter((g) => g.isActive);
    expect(activeGoals.length).toBe(1);
    expect(activeGoals[0].targetKgPerWeek).toBe(60);
  });

  it("rejects invalid targetKgPerWeek (zero)", async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("x-user-id", TEST_USER)
      .send({ targetKgPerWeek: 0 });

    expect(res.status).toBe(400);
  });

  it("rejects negative targetKgPerWeek", async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("x-user-id", TEST_USER)
      .send({ targetKgPerWeek: -50 });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/goals", () => {
  it("returns an array of goals for the user", async () => {
    const res = await request(app)
      .get("/api/goals")
      .set("x-user-id", TEST_USER);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("each goal has required fields", async () => {
    const res = await request(app)
      .get("/api/goals")
      .set("x-user-id", TEST_USER);

    for (const goal of res.body) {
      expect(goal).toHaveProperty("id");
      expect(goal).toHaveProperty("targetKgPerWeek");
      expect(goal).toHaveProperty("isActive");
      expect(goal).toHaveProperty("startDate");
    }
  });
});

describe("GET /api/goals/progress", () => {
  it("returns progress data with required fields", async () => {
    const res = await request(app)
      .get("/api/goals/progress")
      .set("x-user-id", TEST_USER);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("currentKg");
    expect(res.body).toHaveProperty("targetKgPerWeek");
    expect(res.body).toHaveProperty("percentUsed");
    expect(res.body).toHaveProperty("onTrack");
  });

  it("percentUsed is between 0 and 100", async () => {
    const res = await request(app)
      .get("/api/goals/progress")
      .set("x-user-id", TEST_USER);

    expect(res.body.percentUsed).toBeGreaterThanOrEqual(0);
    expect(res.body.percentUsed).toBeLessThanOrEqual(100);
  });
});

describe("PATCH /api/goals/:id", () => {
  let goalId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("x-user-id", TEST_USER)
      .send({ targetKgPerWeek: 90 });
    goalId = res.body.id;
  });

  it("updates targetKgPerWeek of an existing goal", async () => {
    const res = await request(app)
      .patch(`/api/goals/${goalId}`)
      .set("x-user-id", TEST_USER)
      .send({ targetKgPerWeek: 70 });

    expect(res.status).toBe(200);
    expect(res.body.targetKgPerWeek).toBe(70);
  });

  it("returns 404 for non-existent goal id", async () => {
    const res = await request(app)
      .patch("/api/goals/nonexistentid123456789")
      .set("x-user-id", TEST_USER)
      .send({ targetKgPerWeek: 50 });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/goals/:id", () => {
  it("deletes a goal and returns 204", async () => {
    const created = await request(app)
      .post("/api/goals")
      .set("x-user-id", TEST_USER)
      .send({ targetKgPerWeek: 55 });

    const res = await request(app)
      .delete(`/api/goals/${created.body.id}`)
      .set("x-user-id", TEST_USER);

    expect(res.status).toBe(204);
  });
});
