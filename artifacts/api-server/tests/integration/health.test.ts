import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("GET /api/healthz", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok" });
  });

  it("includes an uptime field", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.body).toHaveProperty("uptime");
    expect(typeof res.body.uptime).toBe("number");
  });

  it("responds with JSON content-type", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.headers["content-type"]).toMatch(/json/);
  });
});

describe("Security headers (Helmet)", () => {
  it("sets X-Content-Type-Options: nosniff", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("sets X-Frame-Options header", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.headers["x-frame-options"]).toBeDefined();
  });

  it("sets Referrer-Policy header", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.headers["referrer-policy"]).toBeDefined();
  });
});

describe("404 handler", () => {
  it("returns 404 JSON for unknown routes", async () => {
    const res = await request(app).get("/api/does-not-exist-ever");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});

describe("CORS", () => {
  it("includes Access-Control-Allow-Origin header", async () => {
    const res = await request(app)
      .get("/api/healthz")
      .set("Origin", "http://localhost:3000");
    expect(res.headers["access-control-allow-origin"]).toBeDefined();
  });
});
