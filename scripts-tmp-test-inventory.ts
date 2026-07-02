import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  inventory,
  product,
  productVariant,
  stockMovement,
  storeSettings,
  warehouse,
} from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const OUT = new Set(["SALE_OUT", "EXCHANGE_OUT", "DAMAGE_OUT", "TRANSFER_OUT", "ADJUSTMENT_OUT"]);

async function applyStockMovement(
  tx: Tx,
  params: {
    variantId: string;
    storeId: string;
    warehouseId: string;
    type: string;
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
    .where(and(eq(inventory.variantId, params.variantId), eq(inventory.warehouseId, params.warehouseId)));

  const currentQuantity = existing?.quantity ?? 0;
  const delta = OUT.has(params.type) ? -params.quantity : params.quantity;
  const newQuantity = currentQuantity + delta;

  if (newQuantity < 0) {
    throw new Error(`Insufficient stock: only ${currentQuantity} unit(s) available for this movement`);
  }

  await tx
    .insert(inventory)
    .values({ variantId: params.variantId, storeId: params.storeId, warehouseId: params.warehouseId, quantity: newQuantity })
    .onConflictDoUpdate({
      target: [inventory.variantId, inventory.warehouseId],
      set: { quantity: newQuantity, updatedAt: new Date() },
    });

  await tx.insert(stockMovement).values({
    variantId: params.variantId,
    storeId: params.storeId,
    warehouseId: params.warehouseId,
    type: params.type as any,
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

async function main() {
  const [wh] = await db.select().from(warehouse).limit(1);
  const [variant] = await db.select().from(productVariant).limit(1);
  const userResult: any = await db.execute(sql`select id from "user" limit 1`);
  console.log("warehouse", wh.id, "variant", variant.id);

  const performedById = (userResult.rows?.[0] ?? userResult[0])?.id ?? null;
  console.log("performedById", performedById);

  // 1. record a stock-in movement
  const afterIn = await db.transaction((tx) =>
    applyStockMovement(tx, {
      variantId: variant.id,
      storeId: wh.storeId,
      warehouseId: wh.id,
      type: "ADJUSTMENT_IN",
      quantity: 10,
      reason: "test stock in",
      refType: "MANUAL_ADJUSTMENT",
      performedById,
    })
  );
  console.log("after stock in:", afterIn);

  // 2. record a stock-out (damage) movement
  const afterOut = await db.transaction((tx) =>
    applyStockMovement(tx, {
      variantId: variant.id,
      storeId: wh.storeId,
      warehouseId: wh.id,
      type: "DAMAGE_OUT",
      quantity: 3,
      reason: "test damage",
      refType: "MANUAL_ADJUSTMENT",
      performedById,
    })
  );
  console.log("after damage out:", afterOut);

  // 3. try to over-withdraw -> should throw
  try {
    await db.transaction((tx) =>
      applyStockMovement(tx, {
        variantId: variant.id,
        storeId: wh.storeId,
        warehouseId: wh.id,
        type: "DAMAGE_OUT",
        quantity: 999999,
        reason: "should fail",
        refType: "MANUAL_ADJUSTMENT",
        performedById,
      })
    );
    console.log("ERROR: expected throw did not happen");
  } catch (e) {
    console.log("correctly threw on insufficient stock:", (e as Error).message);
  }

  // verify balance unaffected by failed transaction (transaction rollback check)
  const [afterFailedRow] = await db
    .select({ quantity: inventory.quantity })
    .from(inventory)
    .where(and(eq(inventory.variantId, variant.id), eq(inventory.warehouseId, wh.id)));
  console.log("quantity after failed txn (should equal afterOut):", afterFailedRow.quantity);

  // 4. listInventory-style query
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
    .where(and(eq(inventory.storeId, wh.storeId)))
    .orderBy(asc(product.name), asc(productVariant.size));
  console.log("listInventory rows:", rows.length, rows[0]);

  // 5. storeSettings threshold lookup
  const [settings] = await db
    .select({ lowStockThreshold: storeSettings.lowStockThreshold })
    .from(storeSettings)
    .where(eq(storeSettings.storeId, wh.storeId));
  console.log("settings", settings);

  // 6. dead stock report CTE query
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const stockTotals = db
    .$with("stock_totals")
    .as(
      db
        .select({
          variantId: inventory.variantId,
          totalQuantity: sql<number>`sum(${inventory.quantity})`.as("total_quantity"),
        })
        .from(inventory)
        .where(eq(inventory.storeId, wh.storeId))
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
        .where(and(eq(stockMovement.storeId, wh.storeId), eq(stockMovement.type, "SALE_OUT")))
        .groupBy(stockMovement.variantId)
    );

  const deadRows = await db
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
  console.log("deadStockReport rows:", deadRows.length, deadRows[0]);

  // 7. transferStock: create second warehouse & transfer
  const [wh2] = await db.insert(warehouse).values({ storeId: wh.storeId, name: "Test Transfer WH " + Date.now(), isDefault: 0 }).returning();
  await db.transaction(async (tx) => {
    await applyStockMovement(tx, {
      variantId: variant.id,
      storeId: wh.storeId,
      warehouseId: wh.id,
      type: "TRANSFER_OUT",
      quantity: 2,
      reason: "transfer test",
      refType: "STOCK_TRANSFER",
      performedById,
    });
    await applyStockMovement(tx, {
      variantId: variant.id,
      storeId: wh.storeId,
      warehouseId: wh2.id,
      type: "TRANSFER_IN",
      quantity: 2,
      reason: "transfer test",
      refType: "STOCK_TRANSFER",
      performedById,
    });
  });
  const [srcAfter] = await db.select({ quantity: inventory.quantity }).from(inventory).where(and(eq(inventory.variantId, variant.id), eq(inventory.warehouseId, wh.id)));
  const [dstAfter] = await db.select({ quantity: inventory.quantity }).from(inventory).where(and(eq(inventory.variantId, variant.id), eq(inventory.warehouseId, wh2.id)));
  console.log("after transfer: src", srcAfter.quantity, "dst", dstAfter.quantity);

  // 8. findVariantByCode-style query
  const [found] = await db
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
    .where(or(eq(productVariant.barcode, variant.barcode), eq(productVariant.sku, variant.barcode)))
    .limit(1);
  console.log("findVariantByCode result:", found);

  // cleanup: remove test warehouse and its inventory/movement rows, revert quantities
  await db.delete(stockMovement).where(and(eq(stockMovement.variantId, variant.id), eq(stockMovement.refType, "STOCK_TRANSFER")));
  await db.delete(stockMovement).where(and(eq(stockMovement.variantId, variant.id), eq(stockMovement.reason, "test stock in")));
  await db.delete(stockMovement).where(and(eq(stockMovement.variantId, variant.id), eq(stockMovement.reason, "test damage")));
  await db.delete(inventory).where(and(eq(inventory.variantId, variant.id), eq(inventory.warehouseId, wh2.id)));
  await db.delete(warehouse).where(eq(warehouse.id, wh2.id));
  // restore original inventory quantity on main warehouse (undo +10 -3 -2 = +5 net)
  await db
    .update(inventory)
    .set({ quantity: sql`${inventory.quantity} - 5` })
    .where(and(eq(inventory.variantId, variant.id), eq(inventory.warehouseId, wh.id)));

  console.log("cleanup done");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
