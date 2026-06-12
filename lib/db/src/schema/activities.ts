import { pgTable, text, real, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const activitiesTable = pgTable(
  "activities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    subcategory: text("subcategory").notNull(),
    quantity: real("quantity").notNull(),
    unit: text("unit").notNull(),
    co2Grams: real("co2_grams").notNull(),
    description: text("description"),
    loggedAt: timestamp("logged_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    originLat: real("origin_lat"),
    originLng: real("origin_lng"),
    destLat: real("dest_lat"),
    destLng: real("dest_lng"),
  },
  (t) => [
    index("activities_user_logged_idx").on(t.userId, t.loggedAt),
    index("activities_user_category_idx").on(t.userId, t.category, t.loggedAt),
  ]
);

export const insertActivitySchema = createInsertSchema(activitiesTable);
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
