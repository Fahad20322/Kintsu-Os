"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  customer,
  exchangeRecord,
  inventory,
  product,
  productVariant,
  returnRecord,
  sale,
  saleItem,
  stockMovement,
  warehouse,
} from "@/db/schema";
import { requirePermission } from "@/lib/session";
import { returnItemSchema, exchangeItemSchema } from "@/lib/validations/pos";
import { logAudit } from "@/lib/audit";

async function getDefaultWarehouseId(storeId: string) {
  const [wh] = await db
    .select({ id: warehouse.id })
    .from(warehouse)
    .where(and(eq(warehouse.storeId, storeId), eq(warehouse.isDefault, 1)))
    .limit(1);
  return wh?.id;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function refreshSaleStatus(tx: Tx, saleId: string) {
  const items = await tx.select().from(saleItem).where(eq(saleItem.saleId, saleId));
  const allReturned = items.every((i) => i.returnedQuantity >= i.quantity);
  const anyReturned = items.some((i) => i.returnedQuantity > 0);
  await tx
    .update(sale)
    .set({ status: allReturned ? "RETURNED" : anyReturned ? "PARTIALLY_RETURNED" : "COMPLETED" })
    .where(eq(sale.id, saleId));
}

export async function processReturn(rawInput: unknown) {
  const user = await requirePermission("pos:return");
  const input = returnItemSchema.parse(rawInput);
  if (!user.storeId) throw new Error("No store associated with this account");

  const [item] = await db.select().from(saleItem).where(eq(saleItem.id, input.saleItemId));
  if (!item) throw new Error("Sale item not found");

  const remaining = item.quantity - item.returnedQuantity;
  if (input.quantity > remaining) {
    throw new Error(`Only ${remaining} unit(s) are eligible for return`);
  }

  const [saleRow] = await db.select().from(sale).where(eq(sale.id, item.saleId));
  const warehouseId = await getDefaultWarehouseId(user.storeId);
  if (!warehouseId) throw new Error("No default warehouse configured for this store");

  const unitTotal = Number(item.lineTotal) / item.quantity;
  const refundAmount = Math.round(unitTotal * input.quantity * 100) / 100;

  await db.transaction(async (tx) => {
    await tx.insert(returnRecord).values({
      saleId: item.saleId,
      saleItemId: item.id,
      quantity: input.quantity,
      refundAmount: String(refundAmount),
      refundMethod: input.refundMethod,
      reason: input.reason,
      processedById: user.id,
    });

    await tx
      .update(saleItem)
      .set({ returnedQuantity: item.returnedQuantity + input.quantity })
      .where(eq(saleItem.id, item.id));

    const [inv] = await tx
      .select()
      .from(inventory)
      .where(and(eq(inventory.variantId, item.variantId), eq(inventory.warehouseId, warehouseId)));

    const newQty = (inv?.quantity ?? 0) + input.quantity;
    if (inv) {
      await tx.update(inventory).set({ quantity: newQty }).where(eq(inventory.id, inv.id));
    } else {
      await tx.insert(inventory).values({
        variantId: item.variantId,
        storeId: user.storeId!,
        warehouseId,
        quantity: newQty,
      });
    }

    await tx.insert(stockMovement).values({
      variantId: item.variantId,
      storeId: user.storeId!,
      warehouseId,
      type: "RETURN_IN",
      quantity: input.quantity,
      balanceAfter: newQty,
      reason: input.reason ?? "Customer return",
      refType: "RETURN",
      refId: item.saleId,
      performedById: user.id,
    });

    if (saleRow?.customerId) {
      const [cust] = await tx
        .select({ totalSpend: customer.totalSpend })
        .from(customer)
        .where(eq(customer.id, saleRow.customerId));
      const updatedSpend = Math.max(0, Number(cust?.totalSpend ?? 0) - refundAmount);
      await tx
        .update(customer)
        .set({ totalSpend: String(updatedSpend) })
        .where(eq(customer.id, saleRow.customerId));
    }

    await refreshSaleStatus(tx, item.saleId);
  });

  revalidatePath(`/pos/invoice/${item.saleId}`);
  revalidatePath("/pos/history");
  revalidatePath("/inventory");

  await logAudit({
    userId: user.id,
    storeId: user.storeId,
    action: "SALE_RETURN_PROCESSED",
    entityType: "sale",
    entityId: item.saleId,
    metadata: { saleItemId: item.id, quantity: input.quantity, refundAmount, reason: input.reason },
  });

  return { refundAmount };
}

export async function processExchange(rawInput: unknown) {
  const user = await requirePermission("pos:exchange");
  const input = exchangeItemSchema.parse(rawInput);
  if (!user.storeId) throw new Error("No store associated with this account");

  const [original] = await db
    .select()
    .from(saleItem)
    .where(eq(saleItem.id, input.originalSaleItemId));
  if (!original) throw new Error("Original sale item not found");

  const remaining = original.quantity - original.returnedQuantity;
  if (input.returnedQuantity > remaining) {
    throw new Error(`Only ${remaining} unit(s) are eligible for exchange`);
  }

  const warehouseId = await getDefaultWarehouseId(user.storeId);
  if (!warehouseId) throw new Error("No default warehouse configured for this store");

  const originalUnitTotal = Number(original.lineTotal) / original.quantity;
  const refundAmount = Math.round(originalUnitTotal * input.returnedQuantity * 100) / 100;

  const newTaxable = input.newUnitPrice * input.newQuantity;
  const newGst = Math.round(((newTaxable * input.newGstRate) / 100) * 100) / 100;
  const newTotal = Math.round((newTaxable + newGst) * 100) / 100;
  const priceDifference = Math.round((newTotal - refundAmount) * 100) / 100;

  const [newVariant] = await db
    .select({ sku: productVariant.sku, name: product.name })
    .from(productVariant)
    .innerJoin(product, eq(productVariant.productId, product.id))
    .where(eq(productVariant.id, input.newVariantId));
  if (!newVariant) throw new Error("New product variant not found");

  await db.transaction(async (tx) => {
    // Return the original item back into stock.
    const [origInv] = await tx
      .select()
      .from(inventory)
      .where(
        and(eq(inventory.variantId, original.variantId), eq(inventory.warehouseId, warehouseId))
      );
    const origNewQty = (origInv?.quantity ?? 0) + input.returnedQuantity;
    if (origInv) {
      await tx.update(inventory).set({ quantity: origNewQty }).where(eq(inventory.id, origInv.id));
    } else {
      await tx.insert(inventory).values({
        variantId: original.variantId,
        storeId: user.storeId!,
        warehouseId,
        quantity: origNewQty,
      });
    }
    await tx.insert(stockMovement).values({
      variantId: original.variantId,
      storeId: user.storeId!,
      warehouseId,
      type: "EXCHANGE_IN",
      quantity: input.returnedQuantity,
      balanceAfter: origNewQty,
      reason: "Exchange - original item returned",
      refType: "EXCHANGE",
      refId: original.saleId,
      performedById: user.id,
    });

    // Issue the new item out of stock.
    const [newInv] = await tx
      .select()
      .from(inventory)
      .where(
        and(eq(inventory.variantId, input.newVariantId), eq(inventory.warehouseId, warehouseId))
      );
    const newInvQty = newInv?.quantity ?? 0;
    if (newInvQty < input.newQuantity) {
      throw new Error(`Insufficient stock for SKU ${newVariant.sku}`);
    }
    const newQtyAfter = newInvQty - input.newQuantity;
    await tx
      .update(inventory)
      .set({ quantity: newQtyAfter })
      .where(eq(inventory.id, newInv!.id));

    await tx.insert(stockMovement).values({
      variantId: input.newVariantId,
      storeId: user.storeId!,
      warehouseId,
      type: "EXCHANGE_OUT",
      quantity: input.newQuantity,
      balanceAfter: newQtyAfter,
      reason: "Exchange - new item issued",
      refType: "EXCHANGE",
      refId: original.saleId,
      performedById: user.id,
    });

    await tx
      .update(saleItem)
      .set({ returnedQuantity: original.returnedQuantity + input.returnedQuantity })
      .where(eq(saleItem.id, original.id));

    await tx.insert(exchangeRecord).values({
      originalSaleId: original.saleId,
      originalSaleItemId: original.id,
      returnedQuantity: input.returnedQuantity,
      newVariantId: input.newVariantId,
      newQuantity: input.newQuantity,
      priceDifference: String(priceDifference),
      processedById: user.id,
    });

    await refreshSaleStatus(tx, original.saleId);
  });

  revalidatePath(`/pos/invoice/${original.saleId}`);
  revalidatePath("/inventory");

  await logAudit({
    userId: user.id,
    storeId: user.storeId,
    action: "SALE_EXCHANGE_PROCESSED",
    entityType: "sale",
    entityId: original.saleId,
    metadata: {
      originalSaleItemId: original.id,
      returnedQuantity: input.returnedQuantity,
      newVariantId: input.newVariantId,
      newQuantity: input.newQuantity,
      priceDifference,
    },
  });

  return { priceDifference };
}
