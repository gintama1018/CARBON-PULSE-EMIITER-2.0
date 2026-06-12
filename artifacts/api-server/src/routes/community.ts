import { Router } from "express";
import { db, activitiesTable, usersTable } from "@workspace/db";
import { eq, and, gte, ne } from "drizzle-orm";
import { requireUserId } from "../lib/requireUserId";
import { gramsToKg } from "../lib/units";
import { COMMUNITY_QUERY_LIMIT } from "../lib/constants";

const router = Router();

router.get("/community/stats", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  // Get all users' week totals
  const allActivities = await db.select().from(activitiesTable)
    .where(gte(activitiesTable.loggedAt, weekStart))
    .limit(COMMUNITY_QUERY_LIMIT);

  const userTotals: Record<string, number> = {};
  const userCategoryTotals: Record<string, Record<string, number>> = {};

  for (const a of allActivities) {
    userTotals[a.userId] = (userTotals[a.userId] ?? 0) + gramsToKg(a.co2Grams);
    if (!userCategoryTotals[a.userId]) userCategoryTotals[a.userId] = {};
    userCategoryTotals[a.userId][a.category] =
      (userCategoryTotals[a.userId][a.category] ?? 0) + gramsToKg(a.co2Grams);
  }

  const userWeekKg = userTotals[userId] ?? 0;
  const allKgs = Object.values(userTotals);
  const totalUsers = Math.max(allKgs.length, 1);
  const globalAvgKg = allKgs.length ? allKgs.reduce((s, v) => s + v, 0) / allKgs.length : 80;

  const sorted = [...allKgs].sort((a, b) => a - b);
  const rank = sorted.findIndex((v) => v >= userWeekKg);
  const userPercentile = allKgs.length <= 1 ? 50 : Math.round(((allKgs.length - 1 - rank) / (allKgs.length - 1)) * 100);

  // Category averages
  const CATEGORIES = ["TRANSPORT", "FOOD", "ENERGY", "SHOPPING", "WASTE"];
  const categoryAverages = CATEGORIES.map((cat) => {
    const userKgs = Object.values(userCategoryTotals)
      .map((c) => c[cat] ?? 0)
      .filter((v) => v > 0);
    const avgKg = userKgs.length ? userKgs.reduce((s, v) => s + v, 0) / userKgs.length : 0;
    return {
      category: cat,
      avgKg,
      userKg: userCategoryTotals[userId]?.[cat] ?? 0,
    };
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const regionLabel = user?.region === "IN" ? "India" : user?.region ?? "Global";

  res.json({
    userWeekKg,
    globalAvgKg,
    userPercentile,
    totalUsers,
    regionLabel,
    categoryAverages,
  });
});

export default router;
