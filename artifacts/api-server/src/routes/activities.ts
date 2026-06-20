import { Router } from "express";
import { db, activitiesTable, usersTable } from "@workspace/db";
import type { z } from "zod";
import {
  CreateActivityBody,
  UpdateActivityBody,
  UpdateActivityParams,
  DeleteActivityParams,
  GetActivityParams,
  ListActivitiesQueryParams,
  PreviewTransportBody,
} from "@workspace/api-zod";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";
import { validate } from "../middleware/validate";
import { calculateCo2, haversineDistanceKm, getTransportPreview } from "../services/carbonCalc.service";
import { newId } from "../lib/ids";
import { requireUserId } from "../lib/requireUserId";
import { gramsToKg } from "../lib/units";
import { DEFAULT_WEEKLY_BUDGET_KG } from "../lib/constants";

const router = Router();

// GET /activities/summary
router.get("/activities/summary", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allActivities, user] = await Promise.all([
    db.select().from(activitiesTable)
      .where(and(eq(activitiesTable.userId, userId), gte(activitiesTable.loggedAt, monthStart)))
      .orderBy(desc(activitiesTable.loggedAt)),
    db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1),
  ]);

  const todayKg = allActivities
    .filter((a) => a.loggedAt >= todayStart)
    .reduce((s, a) => s + gramsToKg(a.co2Grams), 0);

  const weekKg = allActivities
    .filter((a) => a.loggedAt >= weekStart)
    .reduce((s, a) => s + gramsToKg(a.co2Grams), 0);

  const monthKg = allActivities.reduce((s, a) => s + gramsToKg(a.co2Grams), 0);

  const weeklyBudgetKg = user[0]?.weeklyBudgetKg ?? DEFAULT_WEEKLY_BUDGET_KG;
  const weekPercentUsed = Math.min(100, (weekKg / weeklyBudgetKg) * 100);

  // Category breakdown for the week
  const weekActivities = allActivities.filter((a) => a.loggedAt >= weekStart);
  const catTotals: Record<string, { co2Grams: number; count: number }> = {};
  for (const a of weekActivities) {
    if (!catTotals[a.category]) catTotals[a.category] = { co2Grams: 0, count: 0 };
    catTotals[a.category].co2Grams += a.co2Grams;
    catTotals[a.category].count += 1;
  }

  const totalWeekGrams = weekActivities.reduce((s, a) => s + a.co2Grams, 0) || 1;
  const categoryBreakdown = Object.entries(catTotals).map(([category, v]) => ({
    category,
    co2Kg: gramsToKg(v.co2Grams),
    count: v.count,
    percent: (v.co2Grams / totalWeekGrams) * 100,
  })).sort((a, b) => b.co2Kg - a.co2Kg);

  const topCategory = categoryBreakdown[0]?.category ?? null;

  const recentActivities = allActivities.slice(0, 10).map((a) => ({
    ...a,
    loggedAt: a.loggedAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
  }));

  res.json({
    todayKg,
    weekKg,
    monthKg,
    weekBudgetKg: weeklyBudgetKg,
    weekPercentUsed,
    topCategory,
    categoryBreakdown,
    recentActivities,
  });
});

// GET /activities/trend — 30 day daily totals
router.get("/activities/trend", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const activities = await db.select()
    .from(activitiesTable)
    .where(and(eq(activitiesTable.userId, userId), gte(activitiesTable.loggedAt, since)))
    .orderBy(activitiesTable.loggedAt);

  const dayMap: Record<string, number> = {};
  for (const a of activities) {
    const day = a.loggedAt.toISOString().split("T")[0];
    dayMap[day] = (dayMap[day] ?? 0) + gramsToKg(a.co2Grams);
  }

  const result = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    result.push({ date: dateStr, co2Kg: dayMap[dateStr] ?? 0 });
  }

  res.json(result);
});

// GET /activities/heatmap — full year
router.get("/activities/heatmap", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);

  const activities = await db.select()
    .from(activitiesTable)
    .where(and(eq(activitiesTable.userId, userId), gte(activitiesTable.loggedAt, since)));

  const dayMap: Record<string, number> = {};
  for (const a of activities) {
    const day = a.loggedAt.toISOString().split("T")[0];
    dayMap[day] = (dayMap[day] ?? 0) + gramsToKg(a.co2Grams);
  }

  const allKgs = Object.values(dayMap);
  const maxKg = allKgs.length ? Math.max(...allKgs) : 10;

  const result = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const co2Kg = dayMap[dateStr] ?? 0;
    const level = co2Kg === 0 ? 0 : Math.min(4, Math.ceil((co2Kg / maxKg) * 4));
    result.push({ date: dateStr, co2Kg, level });
  }

  res.json(result);
});

// POST /activities/transport-preview
router.post("/activities/transport-preview", validate(PreviewTransportBody), async (req, res) => {
  const { originLat, originLng, destLat, destLng } = req.body as {
    originLat: number; originLng: number; destLat: number; destLng: number;
  };

  let distanceKm = haversineDistanceKm(originLat, originLng, destLat, destLng);

  // Try Google Routes API if key available
  const GOOGLE_ROUTES_KEY = process.env.GOOGLE_ROUTES_API_KEY;
  if (GOOGLE_ROUTES_KEY) {
    try {
      const resp = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_ROUTES_KEY,
          "X-Goog-FieldMask": "routes.distanceMeters",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
          destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
          travelMode: "DRIVE",
        }),
      });
      if (resp.ok) {
        const data = await resp.json() as { routes?: Array<{ distanceMeters?: number }> };
        const meters = data.routes?.[0]?.distanceMeters;
        if (meters) distanceKm = meters / 1000;
      }
    } catch {
      // Fall back to haversine
    }
  }

  res.json({
    distanceKm,
    modes: getTransportPreview(distanceKm),
  });
});

// GET /activities — paginated list
router.get("/activities", validate(ListActivitiesQueryParams, "query"), async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const { page = 1, limit = 20, category, from, to } = req.query as {
    page?: number; limit?: number; category?: string; from?: string; to?: string;
  };

  const conditions = [eq(activitiesTable.userId, userId)];
  if (category) conditions.push(eq(activitiesTable.category, category));
  if (from) conditions.push(gte(activitiesTable.loggedAt, new Date(from)));
  if (to) conditions.push(lte(activitiesTable.loggedAt, new Date(to)));

  const offset = (Number(page) - 1) * Number(limit);
  const [data, [{ total }]] = await Promise.all([
    db.select().from(activitiesTable)
      .where(and(...conditions))
      .orderBy(desc(activitiesTable.loggedAt))
      .limit(Number(limit))
      .offset(offset),
    db.select({ total: count() }).from(activitiesTable).where(and(...conditions)),
  ]);

  res.json({
    data: data.map((a) => ({ ...a, loggedAt: a.loggedAt.toISOString(), createdAt: a.createdAt.toISOString() })),
    total,
    page: Number(page),
    limit: Number(limit),
  });
});

const VALID_CATEGORIES = ["TRANSPORT", "FOOD", "ENERGY", "SHOPPING", "WASTE"] as const;

// POST /activities
router.post("/activities", validate(CreateActivityBody), async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const body = req.body as z.infer<typeof CreateActivityBody>;

  if (!VALID_CATEGORIES.includes(body.category as typeof VALID_CATEGORIES[number])) {
    res.status(400).json({ error: "Invalid category", valid: VALID_CATEGORIES });
    return;
  }
  if (body.quantity <= 0) {
    res.status(400).json({ error: "Quantity must be a positive number" });
    return;
  }

  const co2Grams = calculateCo2(body.subcategory, body.quantity);

  const [created] = await db.insert(activitiesTable).values({
    id: newId(),
    userId,
    category: body.category,
    subcategory: body.subcategory,
    quantity: body.quantity,
    unit: body.unit,
    co2Grams,
    description: body.description,
    loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
    originLat: body.originLat,
    originLng: body.originLng,
    destLat: body.destLat,
    destLng: body.destLng,
  }).returning();

  res.status(201).json({ ...created, loggedAt: created.loggedAt.toISOString(), createdAt: created.createdAt.toISOString() });
});

// GET /activities/:id
router.get("/activities/:id", validate(GetActivityParams, "params"), async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const [activity] = await db.select().from(activitiesTable)
    .where(and(eq(activitiesTable.id, req.params.id), eq(activitiesTable.userId, userId)))
    .limit(1);

  if (!activity) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...activity, loggedAt: activity.loggedAt.toISOString(), createdAt: activity.createdAt.toISOString() });
});

// PATCH /activities/:id
router.patch("/activities/:id", validate(UpdateActivityParams, "params"), validate(UpdateActivityBody), async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const body = req.body as z.infer<typeof UpdateActivityBody>;

  const updates: Record<string, unknown> = {};
  if (body.quantity !== undefined) {
    const [existing] = await db.select().from(activitiesTable)
      .where(and(eq(activitiesTable.id, req.params.id), eq(activitiesTable.userId, userId)))
      .limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    updates.quantity = body.quantity;
    updates.co2Grams = calculateCo2(existing.subcategory, body.quantity);
  }
  if (body.description !== undefined) updates.description = body.description;
  if (body.loggedAt !== undefined) updates.loggedAt = new Date(body.loggedAt);

  const [updated] = await db.update(activitiesTable)
    .set(updates)
    .where(and(eq(activitiesTable.id, req.params.id), eq(activitiesTable.userId, userId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, loggedAt: updated.loggedAt.toISOString(), createdAt: updated.createdAt.toISOString() });
});

// DELETE /activities/:id
router.delete("/activities/:id", validate(DeleteActivityParams, "params"), async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  await db.delete(activitiesTable)
    .where(and(eq(activitiesTable.id, req.params.id), eq(activitiesTable.userId, userId)));
  res.status(204).send();
});

export default router;
