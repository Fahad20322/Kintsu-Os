import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";
import { paymentMethodEnum, saleStatusEnum } from "./enums";
import { store } from "./store";
import { user } from "./auth";
import { customer } from "./customer";
import { productVariant } from "./catalog";

export const couponCode = pgTable("coupon_code", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
  discountFlat: numeric("discount_flat", { precision: 12, scale: 2 }),
  minCartValue: numeric("min_cart_value", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  validFrom: timestamp("valid_from").notNull().defaultNow(),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const giftCard = pgTable("gift_card", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  code: text("code").notNull().unique(),
  initialValue: numeric("initial_value", { precision: 12, scale: 2 }).notNull(),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
  issuedToCustomerId: text("issued_to_customer_id").references(
    () => customer.id,
    { onDelete: "set null" }
  ),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sale = pgTable("sale", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  invoiceNumber: text("invoice_number").notNull().unique(),
  storeId: text("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "restrict" }),
  customerId: text("customer_id").references(() => customer.id, {
    onDelete: "set null",
  }),
  cashierId: text("cashier_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),

  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  couponCodeId: text("coupon_code_id").references(() => couponCode.id, {
    onDelete: "set null",
  }),
  gstAmount: numeric("gst_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  loyaltyPointsEarned: integer("loyalty_points_earned").notNull().default(0),
  loyaltyPointsRedeemed: integer("loyalty_points_redeemed")
    .notNull()
    .default(0),

  status: saleStatusEnum("status").notNull().default("COMPLETED"),
  notes: text("notes"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const saleItem = pgTable("sale_item", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  saleId: text("sale_id")
    .notNull()
    .references(() => sale.id, { onDelete: "cascade" }),
  variantId: text("variant_id")
    .notNull()
    .references(() => productVariant.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull(),
  gstAmount: numeric("gst_amount", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  returnedQuantity: integer("returned_quantity").notNull().default(0),
});

export const payment = pgTable("payment", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  saleId: text("sale_id")
    .notNull()
    .references(() => sale.id, { onDelete: "cascade" }),
  method: paymentMethodEnum("method").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  referenceNumber: text("reference_number"),
  giftCardId: text("gift_card_id").references(() => giftCard.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const returnRecord = pgTable("return_record", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  saleId: text("sale_id")
    .notNull()
    .references(() => sale.id, { onDelete: "cascade" }),
  saleItemId: text("sale_item_id")
    .notNull()
    .references(() => saleItem.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  refundAmount: numeric("refund_amount", { precision: 12, scale: 2 }).notNull(),
  refundMethod: paymentMethodEnum("refund_method").notNull(),
  reason: text("reason"),
  processedById: text("processed_by_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const exchangeRecord = pgTable("exchange_record", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  originalSaleId: text("original_sale_id")
    .notNull()
    .references(() => sale.id, { onDelete: "cascade" }),
  originalSaleItemId: text("original_sale_item_id")
    .notNull()
    .references(() => saleItem.id, { onDelete: "cascade" }),
  returnedQuantity: integer("returned_quantity").notNull(),
  newVariantId: text("new_variant_id")
    .notNull()
    .references(() => productVariant.id, { onDelete: "restrict" }),
  newQuantity: integer("new_quantity").notNull(),
  priceDifference: numeric("price_difference", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  newSaleId: text("new_sale_id").references(() => sale.id, {
    onDelete: "set null",
  }),
  processedById: text("processed_by_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
