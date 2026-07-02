"use server";

import { and, desc, eq, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  grn,
  grnItem,
  inventory,
  product,
  productVariant,
  purchaseOrder,
  purchaseOrderItem,
  purchaseOrderStatusEnum,
  stockMovement,
  vendor,
} from "@/db/schema";
import { requirePermission } from "@/lib/session";
import { nextGrnNumber, nextPoNumber } from "@/lib/numbering";
import { grnReceiveSchema, purchaseOrderSchema } from "@/lib/validations/vendor";

type PurchaseOrderStatus = (typeof purchaseOrderStatusEnum.enumValues)[number];

export async function listPurchaseOrders(params?: { status?: string }) {
  await requirePermission("purchases:view");

  const conditions = [];
  if (params?.status) {
    conditions.push(eq(purchaseOrder.status, params.status as PurchaseOrderStatus));
  }

  return db
    .select({
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      status: purchaseOrder.status,
      totalAmount: purchaseOrder.totalAmount,
      expectedDate: purchaseOrder.expectedDate,
      createdAt: purchaseOrder.createdAt,
      vendorId: purchaseOrder.vendorId,
      vendorName: vendor.name,
    })
    .from(purchaseOrder)
    .innerJoin(vendor, eq(purchaseOrder.vendorId, vendor.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(purchaseOrder.createdAt));
}

export async function createPurchaseOrder(rawInput: unknown) {
  const user = await requirePermission("purchases:manage");
  const input = purchaseOrderSchema.parse(rawInput);
  if (!user.storeId) throw new Error("No store associated with this account");

  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.quantityOrdered * item.unitCost,
    0
  );

  const created = await db.transaction(async (tx) => {
    const [po] = await tx
      .insert(purchaseOrder)
      .values({
        poNumber: nextPoNumber(),
        storeId: user.storeId!,
        vendorId: input.vendorId,
        status: "SENT",
        expectedDate: input.expectedDate || null,
        totalAmount: String(totalAmount),
        notes: input.notes || null,
        createdById: user.id,
      })
      .returning();

    for (const item of input.items) {
      await tx.insert(purchaseOrderItem).values({
        purchaseOrderId: po.id,
        variantId: item.variantId,
        quantityOrdered: item.quantityOrdered,
        unitCost: String(item.unitCost),
      });
    }

    return po;
  });

  revalidatePath("/purchases");
  return created;
}

export async function getPurchaseOrder(id: string) {
  await requirePermission("purchases:view");

  const [po] = await db.select().from(purchaseOrder).where(eq(purchaseOrder.id, id));
  if (!po) return null;

  const [vendorRow] = await db.select().from(vendor).where(eq(vendor.id, po.vendorId));

  const items = await db
    .select({
      id: purchaseOrderItem.id,
      variantId: purchaseOrderItem.variantId,
      quantityOrdered: purchaseOrderItem.quantityOrdered,
      quantityReceived: purchaseOrderItem.quantityReceived,
      unitCost: purchaseOrderItem.unitCost,
      sku: productVariant.sku,
      size: productVariant.size,
      color: productVariant.color,
      productName: product.name,
      articleCode: product.articleCode,
    })
    .from(purchaseOrderItem)
    .innerJoin(productVariant, eq(purchaseOrderItem.variantId, productVariant.id))
    .innerJoin(product, eq(productVariant.productId, product.id))
    .where(eq(purchaseOrderItem.purchaseOrderId, id));

  const grns = await db
    .select()
    .from(grn)
    .where(eq(grn.purchaseOrderId, id))
    .orderBy(desc(grn.createdAt));

  const grnIds = grns.map((g) => g.id);
  const grnItemRows = grnIds.length
    ? await db
        .select({
          id: grnItem.id,
          grnId: grnItem.grnId,
          variantId: grnItem.variantId,
          quantityReceived: grnItem.quantityReceived,
          damagedQuantity: grnItem.damagedQuantity,
          unitCost: grnItem.unitCost,
          sku: productVariant.sku,
          size: productVariant.size,
          color: productVariant.color,
          productName: product.name,
        })
        .from(grnItem)
        .innerJoin(productVariant, eq(grnItem.variantId, productVariant.id))
        .innerJoin(product, eq(productVariant.productId, product.id))
        .where(inArray(grnItem.grnId, grnIds))
    : [];

  const grnsWithItems = grns.map((g) => ({
    ...g,
    items: grnItemRows.filter((gi) => gi.grnId === g.id),
  }));

  return {
    purchaseOrder: po,
    vendor: vendorRow ?? null,
    items,
    grns: grnsWithItems,
  };
}

export async function findVariantByCode(code: string) {
  await requirePermission("purchases:view");

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
      purchaseCost: product.purchaseCost,
    })
    .from(productVariant)
    .innerJoin(product, eq(productVariant.productId, product.id))
    .where(or(eq(productVariant.barcode, trimmed), eq(productVariant.sku, trimmed)))
    .limit(1);

  return row ?? null;
}

/**
 * Core GRN-receiving transaction. For every line item received:
 *  - inserts a grn_item row recording total quantityReceived and damagedQuantity,
 *  - increments the matching purchase_order_item.quantityReceived by the full
 *    (sellable + damaged) quantityReceived,
 *  - increments sellable inventory (inventory.quantity) by quantityReceived - damagedQuantity
 *    only — damaged units never enter sellable stock,
 *  - logs a PURCHASE_IN stock movement for the sellable quantity, and
 *  - logs a DAMAGE_OUT stock movement (visibility only, quantity does not change
 *    inventory since damaged units were never added) when damagedQuantity > 0.
 * Finally recomputes the parent PO's status from all of its line items.
 */
export async function receiveGrn(rawInput: unknown) {
  const user = await requirePermission("purchases:manage");
  const input = grnReceiveSchema.parse(rawInput);
  if (!user.storeId) throw new Error("No store associated with this account");

  const itemsToReceive = input.items.filter(
    (item) => item.quantityReceived > 0 || item.damagedQuantity > 0
  );
  if (itemsToReceive.length === 0) {
    throw new Error("Enter a received quantity for at least one line item");
  }
  for (const item of itemsToReceive) {
    if (item.damagedQuantity > item.quantityReceived) {
      throw new Error("Damaged quantity cannot exceed received quantity");
    }
  }

  const createdGrn = await db.transaction(async (tx) => {
    const [po] = await tx
      .select()
      .from(purchaseOrder)
      .where(eq(purchaseOrder.id, input.purchaseOrderId));
    if (!po) throw new Error("Purchase order not found");
    if (po.status === "CANCELLED") {
      throw new Error("Cannot receive stock against a cancelled purchase order");
    }
    if (po.status === "RECEIVED") {
      throw new Error("Purchase order is already fully received");
    }

    const [createdGrnRow] = await tx
      .insert(grn)
      .values({
        grnNumber: nextGrnNumber(),
        purchaseOrderId: input.purchaseOrderId,
        warehouseId: input.warehouseId,
        receivedById: user.id,
        notes: input.notes || null,
      })
      .returning();

    for (const item of itemsToReceive) {
      const [poItem] = await tx
        .select()
        .from(purchaseOrderItem)
        .where(eq(purchaseOrderItem.id, item.purchaseOrderItemId));
      if (!poItem || poItem.purchaseOrderId !== input.purchaseOrderId) {
        throw new Error("Line item does not belong to this purchase order");
      }
      if (poItem.quantityReceived + item.quantityReceived > poItem.quantityOrdered) {
        throw new Error(
          `Cannot receive more than ordered quantity (ordered ${poItem.quantityOrdered}, already received ${poItem.quantityReceived})`
        );
      }

      const sellableQty = item.quantityReceived - item.damagedQuantity;

      await tx.insert(grnItem).values({
        grnId: createdGrnRow.id,
        purchaseOrderItemId: item.purchaseOrderItemId,
        variantId: item.variantId,
        quantityReceived: item.quantityReceived,
        unitCost: poItem.unitCost,
        damagedQuantity: item.damagedQuantity,
      });

      await tx
        .update(purchaseOrderItem)
        .set({ quantityReceived: poItem.quantityReceived + item.quantityReceived })
        .where(eq(purchaseOrderItem.id, item.purchaseOrderItemId));

      const [existingInventory] = await tx
        .select({ quantity: inventory.quantity })
        .from(inventory)
        .where(
          and(
            eq(inventory.variantId, item.variantId),
            eq(inventory.warehouseId, input.warehouseId)
          )
        );
      const currentQuantity = existingInventory?.quantity ?? 0;
      const newQuantity = currentQuantity + sellableQty;

      if (sellableQty !== 0) {
        await tx
          .insert(inventory)
          .values({
            variantId: item.variantId,
            storeId: user.storeId!,
            warehouseId: input.warehouseId,
            quantity: newQuantity,
          })
          .onConflictDoUpdate({
            target: [inventory.variantId, inventory.warehouseId],
            set: { quantity: newQuantity, updatedAt: new Date() },
          });
      }

      if (sellableQty > 0) {
        await tx.insert(stockMovement).values({
          variantId: item.variantId,
          storeId: user.storeId!,
          warehouseId: input.warehouseId,
          type: "PURCHASE_IN",
          quantity: sellableQty,
          balanceAfter: newQuantity,
          unitCost: poItem.unitCost,
          reason: "Goods received against purchase order",
          refType: "GRN",
          refId: createdGrnRow.id,
          performedById: user.id,
        });
      }

      if (item.damagedQuantity > 0) {
        await tx.insert(stockMovement).values({
          variantId: item.variantId,
          storeId: user.storeId!,
          warehouseId: input.warehouseId,
          type: "DAMAGE_OUT",
          quantity: item.damagedQuantity,
          balanceAfter: newQuantity,
          unitCost: poItem.unitCost,
          reason: "Damaged units received in GRN",
          refType: "GRN",
          refId: createdGrnRow.id,
          performedById: user.id,
        });
      }
    }

    const allItems = await tx
      .select({
        quantityOrdered: purchaseOrderItem.quantityOrdered,
        quantityReceived: purchaseOrderItem.quantityReceived,
      })
      .from(purchaseOrderItem)
      .where(eq(purchaseOrderItem.purchaseOrderId, input.purchaseOrderId));

    const allReceived = allItems.every((i) => i.quantityReceived >= i.quantityOrdered);
    const anyReceived = allItems.some((i) => i.quantityReceived > 0);
    const newStatus: PurchaseOrderStatus = allReceived
      ? "RECEIVED"
      : anyReceived
        ? "PARTIALLY_RECEIVED"
        : po.status;

    await tx
      .update(purchaseOrder)
      .set({ status: newStatus })
      .where(eq(purchaseOrder.id, input.purchaseOrderId));

    return createdGrnRow;
  });

  revalidatePath(`/purchases/${input.purchaseOrderId}`);
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  return createdGrn;
}

export async function cancelPurchaseOrder(id: string) {
  await requirePermission("purchases:manage");

  const [po] = await db.select().from(purchaseOrder).where(eq(purchaseOrder.id, id));
  if (!po) throw new Error("Purchase order not found");
  if (po.status === "CANCELLED") throw new Error("Purchase order is already cancelled");
  if (po.status === "RECEIVED") {
    throw new Error("Cannot cancel a fully received purchase order");
  }

  const items = await db
    .select({ quantityReceived: purchaseOrderItem.quantityReceived })
    .from(purchaseOrderItem)
    .where(eq(purchaseOrderItem.purchaseOrderId, id));
  if (items.some((i) => i.quantityReceived > 0)) {
    throw new Error("Cannot cancel a purchase order that already has received items");
  }

  await db.update(purchaseOrder).set({ status: "CANCELLED" }).where(eq(purchaseOrder.id, id));

  revalidatePath("/purchases");
  revalidatePath(`/purchases/${id}`);
}
