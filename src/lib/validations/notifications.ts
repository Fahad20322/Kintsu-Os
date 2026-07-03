import { z } from "zod";

export const notificationChannelValues = ["WHATSAPP", "SMS", "EMAIL"] as const;

export const notificationEventValues = [
  "ORDER_READY",
  "BRIDAL_TRIAL",
  "DELIVERY_REMINDER",
  "LOW_STOCK",
  "PURCHASE_ORDER",
  "BIRTHDAY_OFFER",
  "ALTERATION_READY",
] as const;

export const triggerNotificationSchema = z.object({
  channel: z.enum(notificationChannelValues),
  event: z.enum(notificationEventValues),
  recipient: z.string().min(1, "Recipient is required"),
  data: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
});

export type TriggerNotificationInput = z.infer<typeof triggerNotificationSchema>;
