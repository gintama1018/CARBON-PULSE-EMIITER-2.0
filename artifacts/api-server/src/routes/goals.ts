import { Router } from "express";
import { db, goalsTable, activitiesTable, usersTable } from "@workspace/db";
import type { z } from "zod";
import { CreateGoalBody, UpdateGoalBody, UpdateGoalParams, DeleteGoalParams } from "@workspace/api-zod";
import { eq, and, gte } from "drizzle-orm";
import { validate } from "../middleware/validate";
import { newId } from "../lib/ids";
import { requireUserId } from "../lib/requireUserId";
import { gramsToKg } from "../lib/units";
import { DEFAULT_WEEKLY_BUDGET_KG } from "../lib/constants";

const router = Router();

// GET /goals
router.get("/goals", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const goals = await db.select().from(goalsTable)
    .where(eq(goalsTable.userId, userId))
    .orderBy(goalsTable.createdAt);
  res.json(goals.map(formatGoal));
});

// GET /goals/progress
router.get("/goals/progress", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const [activeGoal] = await db.select().from(goalsTable)
    .where(and(eq(goalsTable.userId, userId), eq(goalsTable.isActive, true)))
    .limit(1);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const activities = await db.select().from(activitiesTable)
    .where(and(eq(activitiesTable.userId, userId), gte(activitiesTable.loggedAt, weekStart)));

  const currentKg = activities.reduce((s, a) => s + gramsToKg(a.co2Grams), 0);

  if (!activeGoal) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const budgetKg = user?.weeklyBudgetKg ?? DEFAULT_WEEKLY_BUDGET_KG;
    res.json({
      hasGoal: false,
      targetKgPerWeek: budgetKg,
      currentKg,
      remainingKg: Math.max(0, budgetKg - currentKg),
      percentUsed: Math.min(100, (currentKg / budgetKg) * 100),
      onTrack: currentKg <= budgetKg,
    });
    return;
  }

  const target = activeGoal.targetKgPerWeek;
  res.json({
    hasGoal: true,
    targetKgPerWeek: target,
    currentKg,
    remainingKg: Math.max(0, target - currentKg),
    percentUsed: Math.min(100, (currentKg / target) * 100),
    onTrack: currentKg <= target,
  });
});

// POST /goals
router.post("/goals", validate(CreateGoalBody), async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const body = req.body as z.infer<typeof CreateGoalBody>;

  if (body.targetKgPerWeek <= 0) {
    res.status(400).json({ error: "targetKgPerWeek must be a positive number" });
    return;
  }

  // Deactivate existing goals without category (overall goal)
  if (!body.category) {
    await db.update(goalsTable).set({ isActive: false })
      .where(and(eq(goalsTable.userId, userId), eq(goalsTable.isActive, true)));
  }

  const [created] = await db.insert(goalsTable).values({
    id: newId(),
    userId,
    targetKgPerWeek: body.targetKgPerWeek,
    category: body.category,
    startDate: body.startDate ? new Date(body.startDate) : new Date(),
    endDate: body.endDate ? new Date(body.endDate) : undefined,
    isActive: true,
  }).returning();

  res.status(201).json(formatGoal(created));
});

// PATCH /goals/:id
router.patch("/goals/:id", validate(UpdateGoalParams, "params"), validate(UpdateGoalBody), async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const body = req.body as z.infer<typeof UpdateGoalBody>;

  const updates: Record<string, unknown> = {};
  if (body.targetKgPerWeek !== undefined) updates.targetKgPerWeek = body.targetKgPerWeek;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.endDate !== undefined) updates.endDate = new Date(body.endDate);

  const [updated] = await db.update(goalsTable).set(updates)
    .where(and(eq(goalsTable.id, req.params.id), eq(goalsTable.userId, userId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatGoal(updated));
});

// DELETE /goals/:id
router.delete("/goals/:id", validate(DeleteGoalParams, "params"), async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  await db.delete(goalsTable).where(and(eq(goalsTable.id, req.params.id), eq(goalsTable.userId, userId)));
  res.status(204).send();
});

function formatGoal(g: typeof goalsTable.$inferSelect) {
  return {
    ...g,
    startDate: g.startDate.toISOString(),
    endDate: g.endDate?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
  };
}

export default router;
