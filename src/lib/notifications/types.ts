import type { notificationEventEnum } from "@/db/schema/enums";

/**
 * Mirrors the `notification_channel` Postgres enum (src/db/schema/enums.ts).
 * Kept as a separate type alias (rather than importing the pg-core enum type)
 * so this file has no runtime dependency on the DB schema.
 */
export type NotificationChannel = "WHATSAPP" | "SMS" | "EMAIL";

export type NotificationEvent = (typeof notificationEventEnum.enumValues)[number];

export type NotificationSendInput = {
  recipient: string;
  subject?: string;
  body: string;
};

export type NotificationSendResult = {
  success: boolean;
  error?: string;
};

/**
 * Every channel (console/dev, WhatsApp, SMS, email, ...future) implements this
 * interface. `sendNotification` in ./index.ts is the only thing that talks to
 * adapters directly — callers elsewhere in the app should never import an
 * adapter file directly.
 */
export interface NotificationAdapter {
  send(input: NotificationSendInput): Promise<NotificationSendResult>;
}

export type RenderedTemplate = {
  subject?: string;
  body: string;
};

export type TemplateData = Record<string, string | number>;

function interpolate(template: string, data: TemplateData): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = data[key];
    return value === undefined ? match : String(value);
  });
}

/**
 * One template per notification_event enum value. Templates are plain string
 * interpolation (`{fieldName}` placeholders) — intentionally no templating
 * library, since messages are short and the field set per event is small and
 * stable.
 */
export const NOTIFICATION_TEMPLATES: Record<
  NotificationEvent,
  (data: TemplateData) => RenderedTemplate
> = {
  ORDER_READY: (data) => ({
    subject: "Your order is ready",
    body: interpolate(
      "Hi {customerName}, your order {orderRef} is ready for pickup at {storeName}!",
      data
    ),
  }),
  BRIDAL_TRIAL: (data) => ({
    subject: "Bridal trial reminder",
    body: interpolate(
      "Hi {customerName}, your bridal trial for {orderRef} is scheduled on {trialDate} at {storeName}.",
      data
    ),
  }),
  DELIVERY_REMINDER: (data) => ({
    subject: "Delivery reminder",
    body: interpolate(
      "Hi {customerName}, this is a reminder that {itemDescription} is due for delivery on {deliveryDate}.",
      data
    ),
  }),
  LOW_STOCK: (data) => ({
    subject: "Low stock alert",
    body: interpolate(
      "Low stock alert: {productName} ({variantLabel}) has only {quantity} units left at {storeName}.",
      data
    ),
  }),
  PURCHASE_ORDER: (data) => ({
    subject: "Purchase order update",
    body: interpolate(
      "Purchase order {orderRef} to {vendorName} is now {status}.",
      data
    ),
  }),
  BIRTHDAY_OFFER: (data) => ({
    subject: "Happy Birthday!",
    body: interpolate(
      "Happy Birthday {customerName}! Enjoy {offerDetails} on your next visit to {storeName}.",
      data
    ),
  }),
  ALTERATION_READY: (data) => ({
    subject: "Alteration ready",
    body: interpolate(
      "Hi {customerName}, your alteration job {jobNumber} is ready for pickup at {storeName}.",
      data
    ),
  }),
  SECURITY_CODE: (data) => ({
    subject: "Your Kintsu OS verification code",
    body: interpolate(
      "Your verification code is {code}. It expires in {expiresInMinutes} minutes. Do not share this code with anyone.",
      data
    ),
  }),
};
