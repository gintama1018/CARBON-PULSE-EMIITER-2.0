import { pgTable, text, real, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emissionFactorsTable = pgTable(
  "emission_factors",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull(),
    subcategory: text("subcategory").notNull().unique(),
    factorGPerUnit: real("factor_g_per_unit").notNull(),
    unit: text("unit").notNull(),
    label: text("label").notNull(),
    region: text("region").notNull().default("IN"),
    source: text("source").notNull(),
    validFrom: timestamp("valid_from").notNull().defaultNow(),
  },
  (t) => [
    index("ef_category_sub_idx").on(t.category, t.subcategory, t.region),
  ]
);

export const insertEmissionFactorSchema = createInsertSchema(emissionFactorsTable);
export type InsertEmissionFactor = z.infer<typeof insertEmissionFactorSchema>;
export type EmissionFactor = typeof emissionFactorsTable.$inferSelect;
