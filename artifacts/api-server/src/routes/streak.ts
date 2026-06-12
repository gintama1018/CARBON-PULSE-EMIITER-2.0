import { Router } from "express";
import { db, activitiesTable, usersTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { requireUserId } from "../lib/requireUserId";
import { gramsToKg } from "../lib/units";
import { DEFAULT_WEEKLY_BUDGET_KG } from "../lib/constants";

const router = Router();

const BADGES = [
  { id: "first_log", label: "First Step", description: "Log your first activity" },
  { id: "streak_3", label: "3-Day Streak", description: "Stay under budget 3 days in a row" },
  { id: "streak_7", label: "Green Week", description: "Stay under budget for a full week" },
  { id: "streak_30", label: "Climate Champion", description: "30-day green streak" },
  { id: "under_budget", label: "Budget Hero", description: "Finish a week under your carbon budget" },
  { id: "low_transport", label: "Clean Commuter", description: "Keep transport under 10 kg this week" },
  { id: "low_food", label: "Plant Powered", description: "Keep food emissions under 5 kg this week" },
];

router.get("/streak", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  // Get 60 days of activities
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const [activities, [user]] = await Promise.all([
    db.select().from(activitiesTable)
      .where(and(eq(activitiesTable.userId, userId), gte(activitiesTable.loggedAt, since))),
    db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1),
  ]);

  const weeklyBudgetKg = user?.weeklyBudgetKg ?? DEFAULT_WEEKLY_BUDGET_KG;
  const dailyBudgetKg = weeklyBudgetKg / 7;

  // Build daily totals
  const dayMap: Record<string, number> = {};
  for (const a of activities) {
    const day = a.loggedAt.toISOString().split("T")[0];
    dayMap[day] = (dayMap[day] ?? 0) + gramsToKg(a.co2Grams);
  }

  // Calculate streak (days with logging AND under budget)
  const today = new Date().toISOString().split("T")[0];
  const todayLogged = !!dayMap[today];
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const kg = dayMap[dateStr] ?? 0;
    const underBudget = kg > 0 && kg <= dailyBudgetKg;

    if (underBudget) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
      if (i === 0 || currentStreak === i) currentStreak = tempStreak;
    } else {
      if (i > 0) { longestStreak = Math.max(longestStreak, tempStreak); tempStreak = 0; }
    }
  }

  // Week CO2 for badge checks
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekActivities = activities.filter((a) => a.loggedAt >= weekStart);
  const weekKg = weekActivities.reduce((s, a) => s + gramsToKg(a.co2Grams), 0);
  const weekTransportKg = weekActivities
    .filter((a) => a.category === "TRANSPORT")
    .reduce((s, a) => s + gramsToKg(a.co2Grams), 0);
  const weekFoodKg = weekActivities
    .filter((a) => a.category === "FOOD")
    .reduce((s, a) => s + gramsToKg(a.co2Grams), 0);
  const hasAnyLog = activities.length > 0;

  const badges = BADGES.map((b) => {
    let earned = false;
    switch (b.id) {
      case "first_log": earned = hasAnyLog; break;
      case "streak_3": earned = longestStreak >= 3; break;
      case "streak_7": earned = longestStreak >= 7; break;
      case "streak_30": earned = longestStreak >= 30; break;
      case "under_budget": earned = weekKg <= weeklyBudgetKg && weekKg > 0; break;
      case "low_transport": earned = weekTransportKg > 0 && weekTransportKg < 10; break;
      case "low_food": earned = weekFoodKg > 0 && weekFoodKg < 5; break;
    }
    return { ...b, earned, earnedAt: earned ? new Date().toISOString() : null };
  });

  res.json({ currentStreak, longestStreak, todayLogged, weeklyBudgetKg, weekKg, badges });
});

export default router;
