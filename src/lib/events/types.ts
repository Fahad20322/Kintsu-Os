/**
 * Business events emitted from server actions. This is the seam described
 * in the architecture spec for an "event bus" — today it's an in-process
 * EventEmitter (see bus.ts), but every producer/consumer talks only to
 * `emitEvent`/`onEvent`, so swapping in a real broker (SNS/EventBridge,
 * Kafka, Redis Streams) later means changing bus.ts only.
 */
export interface KintsuEventMap {
  "sale.completed": {
    saleId: string;
    storeId: string;
    invoiceNumber: string;
    totalAmount: number;
    cashierId: string;
    customerId: string | null;
  };
  "inventory.updated": {
    variantId: string;
    storeId: string;
    warehouseId: string;
    movementType: string;
    quantity: number;
    balanceAfter: number;
    performedById: string;
    refType?: string;
    refId?: string;
  };
  "purchase.received": {
    grnId: string;
    purchaseOrderId: string;
    storeId: string;
    vendorId: string;
    receivedById: string;
  };
  "customer.created": {
    customerId: string;
    name: string;
    mobile: string;
    createdById: string;
  };
  "loyalty.points_earned": {
    customerId: string;
    points: number;
    refType: string;
    refId: string;
  };
  "bridal.status_changed": {
    bridalOrderId: string;
    storeId: string;
    fromStatus: string;
    toStatus: string;
    changedById: string;
  };
}

export type KintsuEventType = keyof KintsuEventMap;
