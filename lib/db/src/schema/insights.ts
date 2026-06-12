import { pgTable, text, real, timestamp, json, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const insightsTable = pgTable(
  "insights",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    weekStartDate: timestamp("week_start_date").notNull(),
    insightText: text("insight_text").notNull(),
    primaryDriver: text("primary_driver").notNull(),
    suggestedAction: text("suggested_action").notNull(),
    projectedSavingKgYear: real("projected_saving_kg_year").notNull(),
    totalCo2KgForWeek: real("total_co2_kg_for_week").notNull(),
    deltaFromPrevWeek: real("delta_from_prev_week").notNull(),
    rawGeminiResponse: json("raw_gemini_response").$type<unknown>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("insights_user_week_unique").on(t.userId, t.weekStartDate)]
);

export const insertInsightSchema = createInsertSchema(insightsTable);
export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type Insight = typeof insightsTable.$inferSelect;
