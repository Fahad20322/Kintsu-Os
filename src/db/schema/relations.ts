import { relations } from "drizzle-orm";
import { store, storeSettings } from "./store";
import { user, session, account } from "./auth";
import {
  category,
  subcategory,
  brand,
  collection,
  product,
  productVariant,
} from "./catalog";
import { warehouse, inventory, stockMovement } from "./inventory";
import { customer, loyaltyTier, loyaltyTransaction } from "./customer";
import {
  sale,
  saleItem,
  payment,
  returnRecord,
  couponCode,
  giftCard,
} from "./sales";
import { bridalOrder, bridalTrial, bridalTimelineEvent, bridalPayment } from "./bridal";
import { tailor, alteration, alterationStatusHistory } from "./alteration";
import {
  vendor,
  purchaseOrder,
  purchaseOrderItem,
  grn,
  grnItem,
  vendorPayment,
} from "./vendor";
import { staffAttendance, staffTarget, commission } from "./staff";

export const storeRelations = relations(store, ({ one, many }) => ({
  settings: one(storeSettings, {
    fields: [store.id],
    references: [storeSettings.storeId],
  }),
  users: many(user),
  warehouses: many(warehouse),
}));

export const userRelations = relations(user, ({ one, many }) => ({
  store: one(store, { fields: [user.storeId], references: [store.id] }),
  sessions: many(session),
  accounts: many(account),
}));

export const categoryRelations = relations(category, ({ many }) => ({
  subcategories: many(subcategory),
  products: many(product),
}));

export const subcategoryRelations = relations(subcategory, ({ one, many }) => ({
  category: one(category, {
    fields: [subcategory.categoryId],
    references: [category.id],
  }),
  products: many(product),
}));

export const brandRelations = relations(brand, ({ many }) => ({
  products: many(product),
}));

export const collectionRelations = relations(collection, ({ many }) => ({
  products: many(product),
}));

export const productRelations = relations(product, ({ one, many }) => ({
  category: one(category, {
    fields: [product.categoryId],
    references: [category.id],
  }),
  subcategory: one(subcategory, {
    fields: [product.subcategoryId],
    references: [subcategory.id],
  }),
  brand: one(brand, { fields: [product.brandId], references: [brand.id] }),
  collection: one(collection, {
    fields: [product.collectionId],
    references: [collection.id],
  }),
  variants: many(productVariant),
}));

export const productVariantRelations = relations(
  productVariant,
  ({ one, many }) => ({
    product: one(product, {
      fields: [productVariant.productId],
      references: [product.id],
    }),
    inventory: many(inventory),
  })
);

export const warehouseRelations = relations(warehouse, ({ one, many }) => ({
  store: one(store, { fields: [warehouse.storeId], references: [store.id] }),
  inventory: many(inventory),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  variant: one(productVariant, {
    fields: [inventory.variantId],
    references: [productVariant.id],
  }),
  store: one(store, { fields: [inventory.storeId], references: [store.id] }),
  warehouse: one(warehouse, {
    fields: [inventory.warehouseId],
    references: [warehouse.id],
  }),
}));

export const stockMovementRelations = relations(stockMovement, ({ one }) => ({
  variant: one(productVariant, {
    fields: [stockMovement.variantId],
    references: [productVariant.id],
  }),
  warehouse: one(warehouse, {
    fields: [stockMovement.warehouseId],
    references: [warehouse.id],
  }),
  performedBy: one(user, {
    fields: [stockMovement.performedById],
    references: [user.id],
  }),
}));

export const customerRelations = relations(customer, ({ one, many }) => ({
  loyaltyTier: one(loyaltyTier, {
    fields: [customer.loyaltyTierId],
    references: [loyaltyTier.id],
  }),
  sales: many(sale),
  loyaltyTransactions: many(loyaltyTransaction),
  bridalOrders: many(bridalOrder),
}));

export const saleRelations = relations(sale, ({ one, many }) => ({
  store: one(store, { fields: [sale.storeId], references: [store.id] }),
  customer: one(customer, {
    fields: [sale.customerId],
    references: [customer.id],
  }),
  cashier: one(user, { fields: [sale.cashierId], references: [user.id] }),
  items: many(saleItem),
  payments: many(payment),
  couponCode: one(couponCode, {
    fields: [sale.couponCodeId],
    references: [couponCode.id],
  }),
}));

export const saleItemRelations = relations(saleItem, ({ one, many }) => ({
  sale: one(sale, { fields: [saleItem.saleId], references: [sale.id] }),
  variant: one(productVariant, {
    fields: [saleItem.variantId],
    references: [productVariant.id],
  }),
  returns: many(returnRecord),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  sale: one(sale, { fields: [payment.saleId], references: [sale.id] }),
  giftCard: one(giftCard, {
    fields: [payment.giftCardId],
    references: [giftCard.id],
  }),
}));

export const returnRecordRelations = relations(returnRecord, ({ one }) => ({
  sale: one(sale, { fields: [returnRecord.saleId], references: [sale.id] }),
  saleItem: one(saleItem, {
    fields: [returnRecord.saleItemId],
    references: [saleItem.id],
  }),
}));

export const bridalOrderRelations = relations(bridalOrder, ({ one, many }) => ({
  store: one(store, { fields: [bridalOrder.storeId], references: [store.id] }),
  customer: one(customer, {
    fields: [bridalOrder.customerId],
    references: [customer.id],
  }),
  tailor: one(tailor, {
    fields: [bridalOrder.tailorId],
    references: [tailor.id],
  }),
  assignedTo: one(user, {
    fields: [bridalOrder.assignedToId],
    references: [user.id],
  }),
  trials: many(bridalTrial),
  timeline: many(bridalTimelineEvent),
  payments: many(bridalPayment),
}));

export const bridalTrialRelations = relations(bridalTrial, ({ one }) => ({
  bridalOrder: one(bridalOrder, {
    fields: [bridalTrial.bridalOrderId],
    references: [bridalOrder.id],
  }),
}));

export const bridalTimelineEventRelations = relations(
  bridalTimelineEvent,
  ({ one }) => ({
    bridalOrder: one(bridalOrder, {
      fields: [bridalTimelineEvent.bridalOrderId],
      references: [bridalOrder.id],
    }),
  })
);

export const tailorRelations = relations(tailor, ({ many }) => ({
  alterations: many(alteration),
  bridalOrders: many(bridalOrder),
}));

export const alterationRelations = relations(alteration, ({ one, many }) => ({
  customer: one(customer, {
    fields: [alteration.customerId],
    references: [customer.id],
  }),
  tailor: one(tailor, {
    fields: [alteration.tailorId],
    references: [tailor.id],
  }),
  statusHistory: many(alterationStatusHistory),
}));

export const alterationStatusHistoryRelations = relations(
  alterationStatusHistory,
  ({ one }) => ({
    alteration: one(alteration, {
      fields: [alterationStatusHistory.alterationId],
      references: [alteration.id],
    }),
  })
);

export const vendorRelations = relations(vendor, ({ many }) => ({
  purchaseOrders: many(purchaseOrder),
  payments: many(vendorPayment),
}));

export const purchaseOrderRelations = relations(
  purchaseOrder,
  ({ one, many }) => ({
    store: one(store, {
      fields: [purchaseOrder.storeId],
      references: [store.id],
    }),
    vendor: one(vendor, {
      fields: [purchaseOrder.vendorId],
      references: [vendor.id],
    }),
    items: many(purchaseOrderItem),
    grns: many(grn),
  })
);

export const purchaseOrderItemRelations = relations(
  purchaseOrderItem,
  ({ one }) => ({
    purchaseOrder: one(purchaseOrder, {
      fields: [purchaseOrderItem.purchaseOrderId],
      references: [purchaseOrder.id],
    }),
    variant: one(productVariant, {
      fields: [purchaseOrderItem.variantId],
      references: [productVariant.id],
    }),
  })
);

export const grnRelations = relations(grn, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrder, {
    fields: [grn.purchaseOrderId],
    references: [purchaseOrder.id],
  }),
  warehouse: one(warehouse, {
    fields: [grn.warehouseId],
    references: [warehouse.id],
  }),
  items: many(grnItem),
}));

export const grnItemRelations = relations(grnItem, ({ one }) => ({
  grn: one(grn, { fields: [grnItem.grnId], references: [grn.id] }),
  variant: one(productVariant, {
    fields: [grnItem.variantId],
    references: [productVariant.id],
  }),
}));

export const staffAttendanceRelations = relations(
  staffAttendance,
  ({ one }) => ({
    user: one(user, {
      fields: [staffAttendance.userId],
      references: [user.id],
    }),
  })
);

export const staffTargetRelations = relations(staffTarget, ({ one }) => ({
  user: one(user, { fields: [staffTarget.userId], references: [user.id] }),
  store: one(store, {
    fields: [staffTarget.storeId],
    references: [store.id],
  }),
}));

export const commissionRelations = relations(commission, ({ one }) => ({
  user: one(user, { fields: [commission.userId], references: [user.id] }),
}));

export const loyaltyTransactionRelations = relations(
  loyaltyTransaction,
  ({ one }) => ({
    customer: one(customer, {
      fields: [loyaltyTransaction.customerId],
      references: [customer.id],
    }),
  })
);
