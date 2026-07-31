import "server-only";
import { onEvent } from "./bus";
import { logAudit } from "@/lib/audit";

declare global {
  var __kintsuEventSubscribersRegistered: boolean | undefined;
}

/**
 * Wires the audit trail (and, in future, notifications/analytics/website
 * sync) up to the business events emitted from server actions. Call once
 * at process start — see the side-effect import in src/lib/events/index.ts.
 */
export function registerEventSubscribers() {
  if (global.__kintsuEventSubscribersRegistered) return;
  global.__kintsuEventSubscribersRegistered = true;

  onEvent("sale.completed", async (e) => {
    await logAudit({
      userId: e.cashierId,
      storeId: e.storeId,
      action: "BILLING_SALE_COMPLETED",
      entityType: "sale",
      entityId: e.saleId,
      metadata: {
        invoiceNumber: e.invoiceNumber,
        totalAmount: e.totalAmount,
        customerId: e.customerId,
      },
    });
  });

  onEvent("inventory.updated", async (e) => {
    await logAudit({
      userId: e.performedById,
      storeId: e.storeId,
      action: `INVENTORY_${e.movementType}`,
      entityType: "productVariant",
      entityId: e.variantId,
      metadata: {
        warehouseId: e.warehouseId,
        quantity: e.quantity,
        balanceAfter: e.balanceAfter,
        refType: e.refType,
        refId: e.refId,
      },
    });
  });

  onEvent("purchase.received", async (e) => {
    await logAudit({
      userId: e.receivedById,
      storeId: e.storeId,
      action: "PURCHASE_RECEIVED",
      entityType: "grn",
      entityId: e.grnId,
      metadata: { purchaseOrderId: e.purchaseOrderId, vendorId: e.vendorId },
    });
  });

  onEvent("customer.created", async (e) => {
    await logAudit({
      userId: e.createdById,
      action: "CUSTOMER_CREATED",
      entityType: "customer",
      entityId: e.customerId,
      metadata: { name: e.name, mobile: e.mobile },
    });
  });

  onEvent("loyalty.points_earned", async (e) => {
    await logAudit({
      action: "LOYALTY_POINTS_EARNED",
      entityType: "customer",
      entityId: e.customerId,
      metadata: { points: e.points, refType: e.refType, refId: e.refId },
    });
  });

  onEvent("bridal.status_changed", async (e) => {
    await logAudit({
      userId: e.changedById,
      storeId: e.storeId,
      action: "BRIDAL_STATUS_CHANGED",
      entityType: "bridalOrder",
      entityId: e.bridalOrderId,
      metadata: { fromStatus: e.fromStatus, toStatus: e.toStatus },
    });
  });
}
