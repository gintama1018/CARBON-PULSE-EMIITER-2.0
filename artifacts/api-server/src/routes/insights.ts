import { Router } from "express";
import { db, insightsTable, activitiesTable, goalsTable, usersTable } from "@workspace/db";
import { eq, and, desc, gte, lt } from "drizzle-orm";
import { generatePersonalizedInsight } from "../services/gemini.service";
import { newId } from "../lib/ids";
import { requireUserId } from "../lib/requireUserId";
import { gramsToKg } from "../lib/units";
import { DEFAULT_WEEKLY_BUDGET_KG } from "../lib/constants";

type Direction = "up" | "down" | "same";

function getDirection(delta: number): Direction {
  if (delta > 1) return "up";
  if (delta < -1) return "down";
  return "same";
}

const router = Router();

// GET /insights
router.get("/insights", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const limit = Number(req.query.limit ?? 8);

  const insights = await db.select().from(insightsTable)
    .where(eq(insightsTable.userId, userId))
    .orderBy(desc(insightsTable.createdAt))
    .limit(limit);

  res.json(insights.map(formatInsight));
});

// GET /insights/latest
router.get("/insights/latest", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const [insight] = await db.select().from(insightsTable)
    .where(eq(insightsTable.userId, userId))
    .orderBy(desc(insightsTable.createdAt))
    .limit(1);

  if (!insight) {
    res.status(404).json({ error: "No insights yet. Log some activities and generate your first insight." });
    return;
  }
  res.json(formatInsight(insight));
});

// POST /insights/generate
router.post("/insights/generate", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);

  const [currentWeek, prevWeek, userRows, goalRows] = await Promise.all([
    db.select().from(activitiesTable)
      .where(and(eq(activitiesTable.userId, userId), gte(activitiesTable.loggedAt, weekStart))),
    db.select().from(activitiesTable)
      .where(and(
        eq(activitiesTable.userId, userId),
        gte(activitiesTable.loggedAt, prevWeekStart),
        lt(activitiesTable.loggedAt, weekStart),
      )),
    db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1),
    db.select().from(goalsTable)
      .where(and(eq(goalsTable.userId, userId), eq(goalsTable.isActive, true)))
      .limit(1),
  ]);

  const totalKg = currentWeek.reduce((s, a) => s + gramsToKg(a.co2Grams), 0);
  const prevTotalKg = prevWeek.reduce((s, a) => s + gramsToKg(a.co2Grams), 0);
  const deltaPercent = prevTotalKg > 0 ? ((totalKg - prevTotalKg) / prevTotalKg) * 100 : 0;
  const direction = getDirection(deltaPercent);

  const catTotals: Record<string, number> = {};
  for (const a of currentWeek) {
    catTotals[a.category] = (catTotals[a.category] ?? 0) + gramsToKg(a.co2Grams);
  }

  const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "transport";
  const activeGoal = goalRows[0];
  const user = userRows[0];
  const goalKg = activeGoal?.targetKgPerWeek ?? user?.weeklyBudgetKg ?? DEFAULT_WEEKLY_BUDGET_KG;

  const result = await generatePersonalizedInsight({
    totalKg,
    deltaPercent,
    direction,
    breakdown: catTotals,
    goalKg,
    topCategory,
  });

  const weekStartDate = new Date(now);
  weekStartDate.setDate(now.getDate() - now.getDay());
  weekStartDate.setHours(0, 0, 0, 0);

  const [existing] = await db.select().from(insightsTable)
    .where(and(
      eq(insightsTable.userId, userId),
      eq(insightsTable.weekStartDate, weekStartDate),
    ))
    .limit(1);

  let insight;
  if (existing) {
    [insight] = await db.update(insightsTable).set({
      insightText: result.insight_text,
      primaryDriver: result.primary_driver,
      suggestedAction: result.suggested_action,
      projectedSavingKgYear: result.projected_annual_saving_kg,
      totalCo2KgForWeek: totalKg,
      deltaFromPrevWeek: deltaPercent,
      rawGeminiResponse: result,
    }).where(eq(insightsTable.id, existing.id)).returning();
  } else {
    [insight] = await db.insert(insightsTable).values({
      id: newId(),
      userId,
      weekStartDate,
      insightText: result.insight_text,
      primaryDriver: result.primary_driver,
      suggestedAction: result.suggested_action,
      projectedSavingKgYear: result.projected_annual_saving_kg,
      totalCo2KgForWeek: totalKg,
      deltaFromPrevWeek: deltaPercent,
      rawGeminiResponse: result,
    }).returning();
  }

  res.status(201).json(formatInsight(insight));
});

function formatInsight(i: typeof insightsTable.$inferSelect) {
  return {
    ...i,
    weekStartDate: i.weekStartDate.toISOString(),
    createdAt: i.createdAt.toISOString(),
  };
}

export default router;
