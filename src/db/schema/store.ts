import {
  boolean,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";

export const store = pgTable("store", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const storeSettings = pgTable("store_settings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  storeId: text("store_id")
    .notNull()
    .unique()
    .references(() => store.id, { onDelete: "cascade" }),

  gstin: text("gstin"),
  defaultGstRate: numeric("default_gst_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("5.00"),

  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  invoiceNextNumber: numeric("invoice_next_number", { precision: 12, scale: 0 })
    .notNull()
    .default("1"),
  invoiceFooterNote: text("invoice_footer_note"),
  invoiceLogoUrl: text("invoice_logo_url"),

  barcodePrefix: text("barcode_prefix").notNull().default("KOS"),
  barcodeSymbology: text("barcode_symbology").notNull().default("CODE128"),
  labelWidthMm: numeric("label_width_mm", { precision: 6, scale: 2 })
    .notNull()
    .default("50"),
  labelHeightMm: numeric("label_height_mm", { precision: 6, scale: 2 })
    .notNull()
    .default("25"),

  printerName: text("printer_name"),
  thermalPrinterWidthMm: numeric("thermal_printer_width_mm", {
    precision: 6,
    scale: 2,
  })
    .notNull()
    .default("80"),

  acceptedPaymentMethods: text("accepted_payment_methods")
    .array()
    .notNull()
    .default(["CASH", "CARD", "UPI"]),

  maxDiscountPercent: numeric("max_discount_percent", {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default("20.00"),

  loyaltyPointsPerRupee: numeric("loyalty_points_per_rupee", {
    precision: 6,
    scale: 3,
  })
    .notNull()
    .default("0.10"),
  loyaltyRedemptionValue: numeric("loyalty_redemption_value", {
    precision: 6,
    scale: 3,
  })
    .notNull()
    .default("0.50"),

  lowStockThreshold: numeric("low_stock_threshold", { precision: 10, scale: 0 })
    .notNull()
    .default("5"),

  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
