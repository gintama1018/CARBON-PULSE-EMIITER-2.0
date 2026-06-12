import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { db, activitiesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const TEST_USER = `test-activities-${Date.now()}`;

beforeAll(async () => {
  await request(app).get("/api/users/me").set("x-user-id", TEST_USER);
});

afterAll(async () => {
  await db.delete(activitiesTable).where(eq(activitiesTable.userId, TEST_USER));
  await db.delete(usersTable).where(eq(usersTable.id, TEST_USER));
});

describe("POST /api/activities", () => {
  it("creates a transport activity and returns 201 with co2Grams", async () => {
    const res = await request(app)
      .post("/api/activities")
      .set("x-user-id", TEST_USER)
      .send({
        category: "TRANSPORT",
        subcategory: "petrol_car",
        quantity: 10,
        unit: "km",
        label: "Daily commute",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.co2Grams).toBe(1920); // 192 g/km × 10 km
    expect(res.body.category).toBe("TRANSPORT");
  });

  it("creates a food activity with correct co2 calculation", async () => {
    const res = await request(app)
      .post("/api/activities")
      .set("x-user-id", TEST_USER)
      .send({
        category: "FOOD",
        subcategory: "chicken",
        quantity: 0.5,
        unit: "kg",
        label: "Chicken dinner",
      });

    expect(res.status).toBe(201);
    expect(res.body.co2Grams).toBeCloseTo(4935, 0); // 9870 × 0.5
  });

  it("rejects activity with missing required fields", async () => {
    const res = await request(app)
      .post("/api/activities")
      .set("x-user-id", TEST_USER)
      .send({ category: "FOOD" }); // missing subcategory, quantity, unit

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("rejects activity with invalid category", async () => {
    const res = await request(app)
      .post("/api/activities")
      .set("x-user-id", TEST_USER)
      .send({
        category: "INVALID_CATEGORY",
        subcategory: "petrol_car",
        quantity: 10,
        unit: "km",
      });

    expect(res.status).toBe(400);
  });

  it("rejects negative quantity", async () => {
    const res = await request(app)
      .post("/api/activities")
      .set("x-user-id", TEST_USER)
      .send({
        category: "TRANSPORT",
        subcategory: "petrol_car",
        quantity: -5,
        unit: "km",
      });

    expect(res.status).toBe(400);
  });

  it("rejects zero quantity", async () => {
    const res = await request(app)
      .post("/api/activities")
      .set("x-user-id", TEST_USER)
      .send({
        category: "TRANSPORT",
        subcategory: "petrol_car",
        quantity: 0,
        unit: "km",
      });

    expect(res.status).toBe(400);
  });

  it("stores the correct userId from header", async () => {
    const res = await request(app)
      .post("/api/activities")
      .set("x-user-id", TEST_USER)
      .send({
        category: "ENERGY",
        subcategory: "electricity_india",
        quantity: 10,
        unit: "kWh",
      });

    expect(res.body.userId).toBe(TEST_USER);
  });
});

describe("GET /api/activities", () => {
  it("returns paginated response with data array", async () => {
    const res = await request(app)
      .get("/api/activities")
      .set("x-user-id", TEST_USER);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("page");
  });

  it("returns activities for the correct user only", async () => {
    const otherUser = `other-${Date.now()}`;
    await request(app)
      .post("/api/activities")
      .set("x-user-id", otherUser)
      .send({ category: "TRANSPORT", subcategory: "bus", quantity: 5, unit: "km" });

    const res = await request(app)
      .get("/api/activities")
      .set("x-user-id", TEST_USER);

    const otherActivities = res.body.data.filter(
      (a: { userId: string }) => a.userId === otherUser,
    );
    expect(otherActivities.length).toBe(0);

    await db.delete(activitiesTable).where(eq(activitiesTable.userId, otherUser));
    await db.delete(usersTable).where(eq(usersTable.id, otherUser));
  });

  it("respects limit query param", async () => {
    const res = await request(app)
      .get("/api/activities?limit=1")
      .set("x-user-id", TEST_USER);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });
});

describe("GET /api/activities/summary", () => {
  it("returns summary with todayKg, weekKg, monthKg", async () => {
    const res = await request(app)
      .get("/api/activities/summary")
      .set("x-user-id", TEST_USER);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("todayKg");
    expect(res.body).toHaveProperty("weekKg");
    expect(res.body).toHaveProperty("monthKg");
  });

  it("returns weekBudgetKg and weekPercentUsed", async () => {
    const res = await request(app)
      .get("/api/activities/summary")
      .set("x-user-id", TEST_USER);

    expect(res.body).toHaveProperty("weekBudgetKg");
    expect(res.body).toHaveProperty("weekPercentUsed");
    expect(res.body.weekPercentUsed).toBeGreaterThanOrEqual(0);
    expect(res.body.weekPercentUsed).toBeLessThanOrEqual(100);
  });

  it("returns categoryBreakdown array", async () => {
    const res = await request(app)
      .get("/api/activities/summary")
      .set("x-user-id", TEST_USER);

    expect(Array.isArray(res.body.categoryBreakdown)).toBe(true);
  });
});

describe("POST /api/activities/transport-preview", () => {
  it("returns distanceKm and modes array for given coordinates", async () => {
    const res = await request(app)
      .post("/api/activities/transport-preview")
      .set("x-user-id", TEST_USER)
      .send({ originLat: 28.61, originLng: 77.20, destLat: 28.55, destLng: 77.10 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("distanceKm");
    expect(Array.isArray(res.body.modes)).toBe(true);
    expect(res.body.modes.length).toBeGreaterThan(0);
    expect(res.body.modes[0]).toHaveProperty("mode");
    expect(res.body.modes[0]).toHaveProperty("co2Grams");
  });

  it("returns 400 when coordinates are missing", async () => {
    const res = await request(app)
      .post("/api/activities/transport-preview")
      .set("x-user-id", TEST_USER)
      .send({});

    expect(res.status).toBe(400);
  });

  it("bicycle always has 0 co2Grams in preview", async () => {
    const res = await request(app)
      .post("/api/activities/transport-preview")
      .set("x-user-id", TEST_USER)
      .send({ originLat: 28.61, originLng: 77.20, destLat: 28.55, destLng: 77.10 });

    const bicycle = res.body.modes.find((m: { mode: string }) => m.mode === "bicycle");
    expect(bicycle?.co2Grams).toBe(0);
  });
});
