"use server";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  inventory,
  product,
  productVariant,
  stockMovement,
  warehouse,
} from "@/db/schema";
import { requirePermission } from "@/lib/session";
import { productSchema } from "@/lib/validations/product";
import { generateBarcodeValue, generateSku } from "@/lib/barcode";

async function getDefaultWarehouseId(storeId: string) {
  const [wh] = await db
    .select({ id: warehouse.id })
    .from(warehouse)
    .where(and(eq(warehouse.storeId, storeId), eq(warehouse.isDefault, 1)))
    .limit(1);
  return wh?.id;
}

export async function listProducts(params: {
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}) {
  await requirePermission("products:view");
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  const conditions = [];
  if (params.search) {
    conditions.push(
      or(
        ilike(product.name, `%${params.search}%`),
        ilike(product.articleCode, `%${params.search}%`)
      )
    );
  }
  if (params.categoryId) {
    conditions.push(eq(product.categoryId, params.categoryId));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(product)
      .where(where)
      .orderBy(desc(product.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(product).where(where),
  ]);

  return { rows, total: count, page, pageSize };
}

export async function getProduct(id: string) {
  await requirePermission("products:view");
  const [row] = await db.select().from(product).where(eq(product.id, id));
  if (!row) return null;
  const variants = await db
    .select()
    .from(productVariant)
    .where(eq(productVariant.productId, id));
  return { ...row, variants };
}

export async function createProduct(rawInput: unknown) {
  const user = await requirePermission("products:manage");
  const input = productSchema.parse(rawInput);

  if (!user.storeId) throw new Error("No store associated with this account");
  const warehouseId = await getDefaultWarehouseId(user.storeId);
  if (!warehouseId) throw new Error("No default warehouse configured for this store");

  const newProduct = await db.transaction(async (tx) => {
    const [createdProduct] = await tx
      .insert(product)
      .values({
        articleCode: input.articleCode,
        name: input.name,
        description: input.description,
        categoryId: input.categoryId || null,
        subcategoryId: input.subcategoryId || null,
        brandId: input.brandId || null,
        collectionId: input.collectionId || null,
        season: input.season,
        fabric: input.fabric,
        pattern: input.pattern,
        sleeveType: input.sleeveType,
        neckType: input.neckType,
        gender: input.gender,
        occasion: input.occasion,
        mrp: String(input.mrp),
        sellingPrice: String(input.sellingPrice),
        purchaseCost: String(input.purchaseCost),
        gstRate: String(input.gstRate),
        images: input.images,
        isActive: input.isActive,
      })
      .returning();

    for (const v of input.variants) {
      const [createdVariant] = await tx
        .insert(productVariant)
        .values({
          productId: createdProduct.id,
          size: v.size,
          color: v.color,
          sku: v.sku || generateSku(input.articleCode, v.size, v.color),
          barcode: v.barcode || generateBarcodeValue(),
        })
        .returning();

      await tx.insert(inventory).values({
        variantId: createdVariant.id,
        storeId: user.storeId!,
        warehouseId,
        quantity: v.openingQuantity,
      });

      if (v.openingQuantity > 0) {
        await tx.insert(stockMovement).values({
          variantId: createdVariant.id,
          storeId: user.storeId!,
          warehouseId,
          type: "ADJUSTMENT_IN",
          quantity: v.openingQuantity,
          balanceAfter: v.openingQuantity,
          unitCost: String(input.purchaseCost),
          reason: "Opening stock",
          refType: "PRODUCT_CREATE",
          refId: createdProduct.id,
          performedById: user.id,
        });
      }
    }

    return createdProduct;
  });

  revalidatePath("/products");
  return newProduct;
}

export async function updateProduct(id: string, rawInput: unknown) {
  await requirePermission("products:manage");
  const input = productSchema.omit({ variants: true }).parse(rawInput);

  const [updated] = await db
    .update(product)
    .set({
      articleCode: input.articleCode,
      name: input.name,
      description: input.description,
      categoryId: input.categoryId || null,
      subcategoryId: input.subcategoryId || null,
      brandId: input.brandId || null,
      collectionId: input.collectionId || null,
      season: input.season,
      fabric: input.fabric,
      pattern: input.pattern,
      sleeveType: input.sleeveType,
      neckType: input.neckType,
      gender: input.gender,
      occasion: input.occasion,
      mrp: String(input.mrp),
      sellingPrice: String(input.sellingPrice),
      purchaseCost: String(input.purchaseCost),
      gstRate: String(input.gstRate),
      images: input.images,
      isActive: input.isActive,
    })
    .where(eq(product.id, id))
    .returning();

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return updated;
}

export async function addVariant(
  productId: string,
  input: { size: string; color: string; openingQuantity: number }
) {
  const user = await requirePermission("products:manage");
  if (!user.storeId) throw new Error("No store associated with this account");

  const [prod] = await db
    .select({ articleCode: product.articleCode, purchaseCost: product.purchaseCost })
    .from(product)
    .where(eq(product.id, productId));
  if (!prod) throw new Error("Product not found");

  const warehouseId = await getDefaultWarehouseId(user.storeId);
  if (!warehouseId) throw new Error("No default warehouse configured for this store");

  const result = await db.transaction(async (tx) => {
    const [createdVariant] = await tx
      .insert(productVariant)
      .values({
        productId,
        size: input.size,
        color: input.color,
        sku: generateSku(prod.articleCode, input.size, input.color),
        barcode: generateBarcodeValue(),
      })
      .returning();

    await tx.insert(inventory).values({
      variantId: createdVariant.id,
      storeId: user.storeId!,
      warehouseId,
      quantity: input.openingQuantity,
    });

    if (input.openingQuantity > 0) {
      await tx.insert(stockMovement).values({
        variantId: createdVariant.id,
        storeId: user.storeId!,
        warehouseId,
        type: "ADJUSTMENT_IN",
        quantity: input.openingQuantity,
        balanceAfter: input.openingQuantity,
        unitCost: prod.purchaseCost,
        reason: "Opening stock",
        refType: "VARIANT_CREATE",
        refId: createdVariant.id,
        performedById: user.id,
      });
    }

    return createdVariant;
  });

  revalidatePath(`/products/${productId}`);
  return result;
}

export async function toggleProductActive(id: string, isActive: boolean) {
  await requirePermission("products:manage");
  await db.update(product).set({ isActive }).where(eq(product.id, id));
  revalidatePath("/products");
}
