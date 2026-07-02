import {
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";

export const customer = pgTable("customer", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().unique(),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  birthday: date("birthday"),
  anniversary: date("anniversary"),
  preferredSize: text("preferred_size"),
  notes: text("notes"),

  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  loyaltyTierId: text("loyalty_tier_id").references(() => loyaltyTier.id, {
    onDelete: "set null",
  }),
  totalSpend: numeric("total_spend", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  totalOrders: integer("total_orders").notNull().default(0),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const loyaltyTier = pgTable("loyalty_tier", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull().unique(),
  minSpend: numeric("min_spend", { precision: 14, scale: 2 }).notNull(),
  pointsMultiplier: numeric("points_multiplier", { precision: 5, scale: 2 })
    .notNull()
    .default("1.00"),
  benefits: text("benefits"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loyaltyTransaction = pgTable("loyalty_transaction", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  customerId: text("customer_id")
    .notNull()
    .references(() => customer.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  type: text("type").notNull(), // EARN | REDEEM | EXPIRE | ADJUST | BIRTHDAY_BONUS
  refType: text("ref_type"),
  refId: text("ref_id"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
