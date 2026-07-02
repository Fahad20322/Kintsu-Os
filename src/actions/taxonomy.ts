"use server";

import { db } from "@/db";
import { brand, category, collection, subcategory } from "@/db/schema";
import { requirePermission } from "@/lib/session";
import { taxonomySchema } from "@/lib/validations/product";

export async function listTaxonomy() {
  const [categories, subcategories, brands, collections] = await Promise.all([
    db.select().from(category).orderBy(category.name),
    db.select().from(subcategory).orderBy(subcategory.name),
    db.select().from(brand).orderBy(brand.name),
    db.select().from(collection).orderBy(collection.name),
  ]);
  return { categories, subcategories, brands, collections };
}

export async function createCategory(input: { name: string }) {
  await requirePermission("products:manage");
  const { name } = taxonomySchema.parse(input);
  const [row] = await db.insert(category).values({ name }).returning();
  return row;
}

export async function createSubcategory(input: {
  name: string;
  categoryId: string;
}) {
  await requirePermission("products:manage");
  const { name } = taxonomySchema.parse({ name: input.name });
  const [row] = await db
    .insert(subcategory)
    .values({ name, categoryId: input.categoryId })
    .returning();
  return row;
}

export async function createBrand(input: { name: string }) {
  await requirePermission("products:manage");
  const { name } = taxonomySchema.parse(input);
  const [row] = await db.insert(brand).values({ name }).returning();
  return row;
}

export async function createCollection(input: { name: string; season?: string }) {
  await requirePermission("products:manage");
  const { name } = taxonomySchema.parse({ name: input.name });
  const [row] = await db
    .insert(collection)
    .values({ name, season: input.season })
    .returning();
  return row;
}
