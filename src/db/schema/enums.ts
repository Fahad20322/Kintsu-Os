import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "CASHIER",
  "SALES_STAFF",
  "INVENTORY_MANAGER",
]);

export const genderEnum = pgEnum("gender", ["MEN", "WOMEN", "KIDS", "UNISEX"]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "PURCHASE_IN",
  "SALE_OUT",
  "RETURN_IN",
  "EXCHANGE_IN",
  "EXCHANGE_OUT",
  "DAMAGE_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "CARD",
  "UPI",
  "GIFT_CARD",
  "STORE_CREDIT",
  "BANK_TRANSFER",
]);

export const saleStatusEnum = pgEnum("sale_status", [
  "COMPLETED",
  "RETURNED",
  "PARTIALLY_RETURNED",
  "EXCHANGED",
  "VOID",
]);

export const bridalOutfitStatusEnum = pgEnum("bridal_outfit_status", [
  "SELECTION",
  "MEASUREMENT",
  "STITCHING",
  "EMBROIDERY",
  "TRIAL",
  "READY",
  "DELIVERED",
]);

export const alterationStatusEnum = pgEnum("alteration_status", [
  "RECEIVED",
  "ASSIGNED",
  "IN_PROGRESS",
  "READY",
  "DELIVERED",
]);

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "DRAFT",
  "SENT",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "WHATSAPP",
  "SMS",
  "EMAIL",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "PENDING",
  "SENT",
  "FAILED",
]);

export const notificationEventEnum = pgEnum("notification_event", [
  "ORDER_READY",
  "BRIDAL_TRIAL",
  "DELIVERY_REMINDER",
  "LOW_STOCK",
  "PURCHASE_ORDER",
  "BIRTHDAY_OFFER",
  "ALTERATION_READY",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "LEAVE",
  "HOLIDAY",
]);
