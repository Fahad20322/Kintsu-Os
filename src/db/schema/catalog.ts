import {
  boolean,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";
import { genderEnum } from "./enums";

export const category = pgTable("category", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subcategory = pgTable("subcategory", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  categoryId: text("category_id")
    .notNull()
    .references(() => category.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const brand = pgTable("brand", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const collection = pgTable("collection", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  season: text("season"),
  year: numeric("year", { precision: 4, scale: 0 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const product = pgTable("product", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  articleCode: text("article_code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),

  categoryId: text("category_id").references(() => category.id, {
    onDelete: "set null",
  }),
  subcategoryId: text("subcategory_id").references(() => subcategory.id, {
    onDelete: "set null",
  }),
  brandId: text("brand_id").references(() => brand.id, {
    onDelete: "set null",
  }),
  collectionId: text("collection_id").references(() => collection.id, {
    onDelete: "set null",
  }),

  season: text("season"),
  fabric: text("fabric"),
  pattern: text("pattern"),
  sleeveType: text("sleeve_type"),
  neckType: text("neck_type"),
  gender: genderEnum("gender").notNull().default("WOMEN"),
  occasion: text("occasion"),

  mrp: numeric("mrp", { precision: 12, scale: 2 }).notNull(),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull(),
  purchaseCost: numeric("purchase_cost", { precision: 12, scale: 2 }).notNull(),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("5.00"),

  images: text("images").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const productVariant = pgTable(
  "product_variant",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    size: text("size").notNull(),
    color: text("color").notNull(),
    sku: text("sku").notNull().unique(),
    barcode: text("barcode").notNull().unique(),
    mrpOverride: numeric("mrp_override", { precision: 12, scale: 2 }),
    sellingPriceOverride: numeric("selling_price_override", {
      precision: 12,
      scale: 2,
    }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("variant_product_size_color_idx").on(t.productId, t.size, t.color)]
);
