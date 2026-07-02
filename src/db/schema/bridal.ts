import {
  date,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";
import { bridalOutfitStatusEnum } from "./enums";
import { store } from "./store";
import { customer } from "./customer";
import { user } from "./auth";
import { tailor } from "./alteration";

export const bridalOrder = pgTable("bridal_order", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  storeId: text("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "restrict" }),
  customerId: text("customer_id").references(() => customer.id, {
    onDelete: "set null",
  }),

  brideName: text("bride_name").notNull(),
  brideMobile: text("bride_mobile"),
  groomName: text("groom_name"),
  groomMobile: text("groom_mobile"),
  weddingDate: date("wedding_date").notNull(),

  outfitDescription: text("outfit_description").notNull(),
  fabric: text("fabric"),
  embroideryDetails: text("embroidery_details"),

  measurements: text("measurements"), // JSON string of measurement fields
  tailorId: text("tailor_id").references(() => tailor.id, {
    onDelete: "set null",
  }),

  status: bridalOutfitStatusEnum("status").notNull().default("SELECTION"),

  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  advancePaid: numeric("advance_paid", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),

  deliveryDate: date("delivery_date"),
  actualDeliveryDate: date("actual_delivery_date"),

  assignedToId: text("assigned_to_id").references(() => user.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const bridalTrial = pgTable("bridal_trial", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  bridalOrderId: text("bridal_order_id")
    .notNull()
    .references(() => bridalOrder.id, { onDelete: "cascade" }),
  trialDate: timestamp("trial_date").notNull(),
  outcome: text("outcome"),
  completed: date("completed_on"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bridalTimelineEvent = pgTable("bridal_timeline_event", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  bridalOrderId: text("bridal_order_id")
    .notNull()
    .references(() => bridalOrder.id, { onDelete: "cascade" }),
  status: bridalOutfitStatusEnum("status").notNull(),
  note: text("note"),
  createdById: text("created_by_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bridalPayment = pgTable("bridal_payment", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  bridalOrderId: text("bridal_order_id")
    .notNull()
    .references(() => bridalOrder.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  method: text("method").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
