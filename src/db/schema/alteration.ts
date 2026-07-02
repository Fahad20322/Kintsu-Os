import {
  boolean,
  date,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";
import { alterationStatusEnum } from "./enums";
import { store } from "./store";
import { customer } from "./customer";
import { user } from "./auth";

export const tailor = pgTable("tailor", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  storeId: text("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  mobile: text("mobile"),
  specialization: text("specialization"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const alteration = pgTable("alteration", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  storeId: text("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "restrict" }),
  jobNumber: text("job_number").notNull().unique(),
  customerId: text("customer_id").references(() => customer.id, {
    onDelete: "set null",
  }),
  itemDescription: text("item_description").notNull(),
  alterationDetails: text("alteration_details").notNull(),
  tailorId: text("tailor_id").references(() => tailor.id, {
    onDelete: "set null",
  }),
  status: alterationStatusEnum("status").notNull().default("RECEIVED"),
  charge: numeric("charge", { precision: 10, scale: 2 }).notNull().default("0"),
  expectedDeliveryDate: date("expected_delivery_date"),
  actualDeliveryDate: date("actual_delivery_date"),
  receivedById: text("received_by_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const alterationStatusHistory = pgTable("alteration_status_history", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  alterationId: text("alteration_id")
    .notNull()
    .references(() => alteration.id, { onDelete: "cascade" }),
  status: alterationStatusEnum("status").notNull(),
  note: text("note"),
  changedById: text("changed_by_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
