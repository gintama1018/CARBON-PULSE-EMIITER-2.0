import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import type { z } from "zod";
import { UpsertMeBody, UpdateMeBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { validate } from "../middleware/validate";
import { requireUserId } from "../lib/requireUserId";
import { DEFAULT_WEEKLY_BUDGET_KG } from "../lib/constants";

const router = Router();

async function ensureUser(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (user) return user;
  const [created] = await db.insert(usersTable).values({
    id: userId,
    email: `${userId}@carbonpulse.app`,
    displayName: userId === "demo-user" ? "Demo User" : userId,
    region: "IN",
    weeklyBudgetKg: DEFAULT_WEEKLY_BUDGET_KG,
  }).returning();
  return created;
}

// GET /users/me — auto-creates demo user on first visit
router.get("/users/me", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const user = await ensureUser(userId);
  res.json(user);
});

// POST /users/me — upsert
router.post("/users/me", validate(UpsertMeBody), async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const body = req.body as z.infer<typeof UpsertMeBody>;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (existing) {
    const [updated] = await db
      .update(usersTable)
      .set({
        email: body.email ?? existing.email,
        displayName: body.displayName ?? existing.displayName,
        avatarUrl: body.avatarUrl ?? existing.avatarUrl,
        region: body.region ?? existing.region,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId))
      .returning();
    res.json(updated);
    return;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      id: userId,
      email: body.email ?? `${userId}@carbonpulse.app`,
      displayName: body.displayName ?? "Demo User",
      avatarUrl: body.avatarUrl,
      region: body.region ?? "IN",
      weeklyBudgetKg: DEFAULT_WEEKLY_BUDGET_KG,
    })
    .returning();
  res.json(created);
});

// PATCH /users/me
router.patch("/users/me", validate(UpdateMeBody), async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const body = req.body as z.infer<typeof UpdateMeBody>;

  if (body.weeklyBudgetKg !== undefined && body.weeklyBudgetKg <= 0) {
    res.status(400).json({ error: "weeklyBudgetKg must be a positive number" });
    return;
  }

  await ensureUser(userId);

  const [updated] = await db
    .update(usersTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json(updated);
});

export default router;
