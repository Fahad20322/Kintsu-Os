import {
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";
import { stockMovementTypeEnum } from "./enums";
import { store } from "./store";
import { productVariant } from "./catalog";
import { user } from "./auth";

export const warehouse = pgTable("warehouse", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  storeId: text("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isDefault: integer("is_default").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inventory = pgTable(
  "inventory",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariant.id, { onDelete: "cascade" }),
    storeId: text("store_id")
      .notNull()
      .references(() => store.id, { onDelete: "cascade" }),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => warehouse.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    reservedQuantity: integer("reserved_quantity").notNull().default(0),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("inventory_variant_warehouse_idx").on(
      t.variantId,
      t.warehouseId
    ),
  ]
);

export const stockMovement = pgTable("stock_movement", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  variantId: text("variant_id")
    .notNull()
    .references(() => productVariant.id, { onDelete: "cascade" }),
  storeId: text("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  warehouseId: text("warehouse_id")
    .notNull()
    .references(() => warehouse.id, { onDelete: "cascade" }),
  type: stockMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }),
  reason: text("reason"),
  refType: text("ref_type"),
  refId: text("ref_id"),
  performedById: text("performed_by_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
