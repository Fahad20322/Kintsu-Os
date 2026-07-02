import {
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";
import { purchaseOrderStatusEnum, paymentMethodEnum } from "./enums";
import { store } from "./store";
import { user } from "./auth";
import { productVariant } from "./catalog";
import { warehouse } from "./inventory";

export const vendor = pgTable("vendor", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  mobile: text("mobile"),
  email: text("email"),
  address: text("address"),
  gstin: text("gstin"),
  openingBalance: numeric("opening_balance", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchaseOrder = pgTable("purchase_order", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  poNumber: text("po_number").notNull().unique(),
  storeId: text("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "restrict" }),
  vendorId: text("vendor_id")
    .notNull()
    .references(() => vendor.id, { onDelete: "restrict" }),
  status: purchaseOrderStatusEnum("status").notNull().default("DRAFT"),
  expectedDate: date("expected_date"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  notes: text("notes"),
  createdById: text("created_by_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const purchaseOrderItem = pgTable("purchase_order_item", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  purchaseOrderId: text("purchase_order_id")
    .notNull()
    .references(() => purchaseOrder.id, { onDelete: "cascade" }),
  variantId: text("variant_id")
    .notNull()
    .references(() => productVariant.id, { onDelete: "restrict" }),
  quantityOrdered: integer("quantity_ordered").notNull(),
  quantityReceived: integer("quantity_received").notNull().default(0),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
});

export const grn = pgTable("grn", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  grnNumber: text("grn_number").notNull().unique(),
  purchaseOrderId: text("purchase_order_id")
    .notNull()
    .references(() => purchaseOrder.id, { onDelete: "cascade" }),
  warehouseId: text("warehouse_id")
    .notNull()
    .references(() => warehouse.id, { onDelete: "restrict" }),
  receivedById: text("received_by_id").references(() => user.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const grnItem = pgTable("grn_item", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  grnId: text("grn_id")
    .notNull()
    .references(() => grn.id, { onDelete: "cascade" }),
  purchaseOrderItemId: text("purchase_order_item_id")
    .notNull()
    .references(() => purchaseOrderItem.id, { onDelete: "cascade" }),
  variantId: text("variant_id")
    .notNull()
    .references(() => productVariant.id, { onDelete: "restrict" }),
  quantityReceived: integer("quantity_received").notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  damagedQuantity: integer("damaged_quantity").notNull().default(0),
});

export const vendorPayment = pgTable("vendor_payment", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  vendorId: text("vendor_id")
    .notNull()
    .references(() => vendor.id, { onDelete: "cascade" }),
  purchaseOrderId: text("purchase_order_id").references(
    () => purchaseOrder.id,
    { onDelete: "set null" }
  ),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  referenceNumber: text("reference_number"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
