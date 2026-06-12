import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { db, insightsTable, usersTable, activitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const TEST_USER = `test-insights-${Date.now()}`;

beforeAll(async () => {
  await request(app).get("/api/users/me").set("x-user-id", TEST_USER);
  // Seed a transport activity so the summary has data to work with
  await request(app)
    .post("/api/activities")
    .set("x-user-id", TEST_USER)
    .send({ category: "TRANSPORT", subcategory: "petrol_car", quantity: 20, unit: "km" });
});

afterAll(async () => {
  await db.delete(insightsTable).where(eq(insightsTable.userId, TEST_USER));
  await db.delete(activitiesTable).where(eq(activitiesTable.userId, TEST_USER));
  await db.delete(usersTable).where(eq(usersTable.id, TEST_USER));
});

describe("GET /api/insights/latest", () => {
  it("returns 404 when no insight exists yet", async () => {
    const res = await request(app)
      .get("/api/insights/latest")
      .set("x-user-id", TEST_USER);

    expect(res.status).toBe(404);
  });
});

describe("POST /api/insights/generate", () => {
  it("generates and returns an insight using fallback (no real Gemini call)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const res = await request(app)
      .post("/api/insights/generate")
      .set("x-user-id", TEST_USER)
      .send({});

    vi.unstubAllEnvs();

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("insightText");
    expect(res.body).toHaveProperty("primaryDriver");
    expect(res.body).toHaveProperty("suggestedAction");
    expect(res.body).toHaveProperty("projectedSavingKgYear");
  });

  it("returned insight has non-empty string fields", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const res = await request(app)
      .post("/api/insights/generate")
      .set("x-user-id", TEST_USER)
      .send({});

    vi.unstubAllEnvs();

    expect(res.body.insightText.length).toBeGreaterThan(10);
    expect(res.body.suggestedAction.length).toBeGreaterThan(10);
  });
});

describe("GET /api/insights/latest (after generate)", () => {
  beforeAll(async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await request(app)
      .post("/api/insights/generate")
      .set("x-user-id", TEST_USER)
      .send({});
    vi.unstubAllEnvs();
  });

  it("returns the generated insight with 200", async () => {
    const res = await request(app)
      .get("/api/insights/latest")
      .set("x-user-id", TEST_USER);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("insightText");
  });

  it("insight belongs to the correct user", async () => {
    const res = await request(app)
      .get("/api/insights/latest")
      .set("x-user-id", TEST_USER);

    expect(res.body.userId).toBe(TEST_USER);
  });
});
