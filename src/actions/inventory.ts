"use server";

import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  inventory,
  product,
  productVariant,
  stockMovement,
  storeSettings,
  warehouse,
} from "@/db/schema";
import { requirePermission } from "@/lib/session";
import type { StockMovementTypeValue } from "@/lib/validations/inventory";

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

const OUT_STOCK_MOVEMENT_TYPES = new Set<StockMovementTypeValue>([
  "SALE_OUT",
  "EXCHANGE_OUT",
  "DAMAGE_OUT",
  "TRANSFER_OUT",
  "ADJUSTMENT_OUT",
]);

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function getLowStockThreshold(storeId: string) {
  const [settings] = await db
    .select({ lowStockThreshold: storeSettings.lowStockThreshold })
    .from(storeSettings)
    .where(eq(storeSettings.storeId, storeId));
  return settings ? Number(settings.lowStockThreshold) : DEFAULT_LOW_STOCK_THRESHOLD;
}

/**
 * Shared ledger primitive: applies one stock movement (in or out) to the
 * inventory row for a variant+warehouse, guarding against negative stock,
 * and writes the corresponding stock_movement audit row. Used by both
 * recordStockMovement (single manual movement) and transferStock (a paired
 * TRANSFER_OUT + TRANSFER_IN within one transaction).
 */
async function applyStockMovement(
  tx: Tx,
  params: {
    variantId: string;
    storeId: string;
    warehouseId: string;
    type: StockMovementTypeValue;
    quantity: number;
    unitCost?: number;
    reason?: string;
    refType: string;
    refId?: string;
    performedById: string;
  }
) {
  const [existing] = await tx
    .select({ quantity: inventory.quantity })
    .from(inventory)
    .where(
      and(
        eq(inventory.variantId, params.variantId),
        eq(inventory.warehouseId, params.warehouseId)
      )
    );

  const currentQuantity = existing?.quantity ?? 0;
  const delta = OUT_STOCK_MOVEMENT_TYPES.has(params.type)
    ? -params.quantity
    : params.quantity;
  const newQuantity = currentQuantity + delta;

  if (newQuantity < 0) {
    throw new Error(
      `Insufficient stock: only ${currentQuantity} unit(s) available for this movement`
    );
  }

  await tx
    .insert(inventory)
    .values({
      variantId: params.variantId,
      storeId: params.storeId,
      warehouseId: params.warehouseId,
      quantity: newQuantity,
    })
    .onConflictDoUpdate({
      target: [inventory.variantId, inventory.warehouseId],
      set: { quantity: newQuantity, updatedAt: new Date() },
    });

  await tx.insert(stockMovement).values({
    variantId: params.variantId,
    storeId: params.storeId,
    warehouseId: params.warehouseId,
    type: params.type,
    quantity: params.quantity,
    balanceAfter: newQuantity,
    unitCost: params.unitCost != null ? String(params.unitCost) : null,
    reason: params.reason,
    refType: params.refType,
    refId: params.refId ?? null,
    performedById: params.performedById,
  });

  return newQuantity;
}

export async function listWarehouses() {
  const user = await requirePermission("inventory:view");
  if (!user.storeId) throw new Error("No store associated with this account");

  return db
    .select()
    .from(warehouse)
    .where(eq(warehouse.storeId, user.storeId))
    .orderBy(desc(warehouse.isDefault), asc(warehouse.name));
}

export async function createWarehouse(name: string) {
  const user = await requirePermission("inventory:manage");
  if (!user.storeId) throw new Error("No store associated with this account");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Warehouse name is required");

  const [created] = await db
    .insert(warehouse)
    .values({ storeId: user.storeId, name: trimmed, isDefault: 0 })
    .returning();

  revalidatePath("/inventory");
  return created;
}

export async function findVariantByCode(code: string) {
  await requirePermission("inventory:view");

  const trimmed = code.trim();
  if (!trimmed) return null;

  const [row] = await db
    .select({
      variantId: productVariant.id,
      sku: productVariant.sku,
      barcode: productVariant.barcode,
      size: productVariant.size,
      color: productVariant.color,
      productName: product.name,
      articleCode: product.articleCode,
    })
    .from(productVariant)
    .innerJoin(product, eq(productVariant.productId, product.id))
    .where(or(eq(productVariant.barcode, trimmed), eq(productVariant.sku, trimmed)))
    .limit(1);

  return row ?? null;
}

export async function listInventory(params: {
  search?: string;
  warehouseId?: string;
  lowStockOnly?: boolean;
}) {
  const user = await requirePermission("inventory:view");
  if (!user.storeId) throw new Error("No store associated with this account");

  const threshold = await getLowStockThreshold(user.storeId);

  const conditions = [eq(inventory.storeId, user.storeId)];
  if (params.warehouseId) {
    conditions.push(eq(inventory.warehouseId, params.warehouseId));
  }
  if (params.search) {
    const clause = or(
      ilike(product.name, `%${params.search}%`),
      ilike(product.articleCode, `%${params.search}%`),
      ilike(productVariant.sku, `%${params.search}%`)
    );
    if (clause) conditions.push(clause);
  }
  if (params.lowStockOnly) {
    conditions.push(sql`${inventory.quantity} <= ${threshold}`);
  }

  const rows = await db
    .select({
      id: inventory.id,
      variantId: inventory.variantId,
      warehouseId: inventory.warehouseId,
      warehouseName: warehouse.name,
      quantity: inventory.quantity,
      reservedQuantity: inventory.reservedQuantity,
      productName: product.name,
      articleCode: product.articleCode,
      size: productVariant.size,
      color: productVariant.color,
      sku: productVariant.sku,
      barcode: productVariant.barcode,
    })
    .from(inventory)
    .innerJoin(productVariant, eq(inventory.variantId, productVariant.id))
    .innerJoin(product, eq(productVariant.productId, product.id))
    .innerJoin(warehouse, eq(inventory.warehouseId, warehouse.id))
    .where(and(...conditions))
    .orderBy(asc(product.name), asc(productVariant.size));

  return { rows, threshold };
}

export async function recordStockMovement(input: {
  variantId: string;
  warehouseId: string;
  type: StockMovementTypeValue;
  quantity: number;
  unitCost?: number;
  reason?: string;
}) {
  const user = await requirePermission("inventory:manage");
  if (!user.storeId) throw new Error("No store associated with this account");
  if (input.quantity <= 0) throw new Error("Quantity must be greater than 0");

  const newQuantity = await db.transaction((tx) =>
    applyStockMovement(tx, {
      variantId: input.variantId,
      storeId: user.storeId!,
      warehouseId: input.warehouseId,
      type: input.type,
      quantity: input.quantity,
      unitCost: input.unitCost,
      reason: input.reason,
      refType: "MANUAL_ADJUSTMENT",
      performedById: user.id,
    })
  );

  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/inventory/dead-stock");
  return { quantity: newQuantity };
}

export async function transferStock(input: {
  variantId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
}) {
  const user = await requirePermission("inventory:manage");
  if (!user.storeId) throw new Error("No store associated with this account");
  if (input.quantity <= 0) throw new Error("Quantity must be greater than 0");
  if (input.fromWarehouseId === input.toWarehouseId) {
    throw new Error("Source and destination warehouses must differ");
  }

  await db.transaction(async (tx) => {
    await applyStockMovement(tx, {
      variantId: input.variantId,
      storeId: user.storeId!,
      warehouseId: input.fromWarehouseId,
      type: "TRANSFER_OUT",
      quantity: input.quantity,
      reason: "Stock transfer",
      refType: "STOCK_TRANSFER",
      performedById: user.id,
    });
    await applyStockMovement(tx, {
      variantId: input.variantId,
      storeId: user.storeId!,
      warehouseId: input.toWarehouseId,
      type: "TRANSFER_IN",
      quantity: input.quantity,
      reason: "Stock transfer",
      refType: "STOCK_TRANSFER",
      performedById: user.id,
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
}

export async function listStockMovements(limit = 100) {
  const user = await requirePermission("inventory:view");
  if (!user.storeId) throw new Error("No store associated with this account");

  return db
    .select({
      id: stockMovement.id,
      type: stockMovement.type,
      quantity: stockMovement.quantity,
      balanceAfter: stockMovement.balanceAfter,
      unitCost: stockMovement.unitCost,
      reason: stockMovement.reason,
      refType: stockMovement.refType,
      createdAt: stockMovement.createdAt,
      warehouseName: warehouse.name,
      productName: product.name,
      articleCode: product.articleCode,
      size: productVariant.size,
      color: productVariant.color,
      sku: productVariant.sku,
    })
    .from(stockMovement)
    .innerJoin(productVariant, eq(stockMovement.variantId, productVariant.id))
    .innerJoin(product, eq(productVariant.productId, product.id))
    .innerJoin(warehouse, eq(stockMovement.warehouseId, warehouse.id))
    .where(eq(stockMovement.storeId, user.storeId))
    .orderBy(desc(stockMovement.createdAt))
    .limit(limit);
}

export async function deadStockReport(daysThreshold = 60) {
  const user = await requirePermission("inventory:view");
  if (!user.storeId) throw new Error("No store associated with this account");

  const cutoff = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

  const stockTotals = db
    .$with("stock_totals")
    .as(
      db
        .select({
          variantId: inventory.variantId,
          totalQuantity: sql<number>`sum(${inventory.quantity})`.as("total_quantity"),
        })
        .from(inventory)
        .where(eq(inventory.storeId, user.storeId))
        .groupBy(inventory.variantId)
    );

  const lastSale = db
    .$with("last_sale")
    .as(
      db
        .select({
          variantId: stockMovement.variantId,
          lastSaleAt: sql<Date>`max(${stockMovement.createdAt})`.as("last_sale_at"),
        })
        .from(stockMovement)
        .where(
          and(eq(stockMovement.storeId, user.storeId), eq(stockMovement.type, "SALE_OUT"))
        )
        .groupBy(stockMovement.variantId)
    );

  const rows = await db
    .with(stockTotals, lastSale)
    .select({
      variantId: productVariant.id,
      productName: product.name,
      articleCode: product.articleCode,
      sku: productVariant.sku,
      size: productVariant.size,
      color: productVariant.color,
      quantity: stockTotals.totalQuantity,
      lastSaleAt: lastSale.lastSaleAt,
    })
    .from(stockTotals)
    .innerJoin(productVariant, eq(stockTotals.variantId, productVariant.id))
    .innerJoin(product, eq(productVariant.productId, product.id))
    .leftJoin(lastSale, eq(lastSale.variantId, productVariant.id))
    .where(
      and(
        sql`${stockTotals.totalQuantity} > 0`,
        or(sql`${lastSale.lastSaleAt} is null`, sql`${lastSale.lastSaleAt} < ${cutoff}`)
      )
    )
    .orderBy(asc(product.name));

  return rows.map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    daysSinceLastSale: row.lastSaleAt
      ? Math.floor((Date.now() - new Date(row.lastSaleAt).getTime()) / (24 * 60 * 60 * 1000))
      : null,
  }));
}
