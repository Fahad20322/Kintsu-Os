import "server-only";
import { db } from "@/db";
import { notificationLog } from "@/db/schema";
import { ConsoleAdapter } from "./adapters/console-adapter";
import { WhatsAppAdapter } from "./adapters/whatsapp-adapter";
import { SmsAdapter } from "./adapters/sms-adapter";
import { EmailAdapter } from "./adapters/email-adapter";
import { NOTIFICATION_TEMPLATES } from "./types";
import type {
  NotificationAdapter,
  NotificationChannel,
  NotificationEvent,
  TemplateData,
} from "./types";

/**
 * Picks the real adapter for a channel if its env vars are present, else
 * falls back to the console/dev adapter. This is the single place that
 * decides "real vs dev" — callers never construct an adapter directly.
 */
export function getAdapter(channel: NotificationChannel): NotificationAdapter {
  switch (channel) {
    case "WHATSAPP":
      if (process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_PHONE_ID) {
        return new WhatsAppAdapter();
      }
      console.log(
        "[notifications] WHATSAPP_API_KEY/WHATSAPP_PHONE_ID not set — falling back to console adapter"
      );
      return new ConsoleAdapter("WHATSAPP");
    case "SMS":
      if (process.env.SMS_API_KEY && process.env.SMS_SENDER_ID) {
        return new SmsAdapter();
      }
      console.log("[notifications] SMS_API_KEY/SMS_SENDER_ID not set — falling back to console adapter");
      return new ConsoleAdapter("SMS");
    case "EMAIL":
      if (
        process.env.EMAIL_SMTP_HOST &&
        process.env.EMAIL_SMTP_PORT &&
        process.env.EMAIL_SMTP_USER &&
        process.env.EMAIL_SMTP_PASSWORD &&
        process.env.EMAIL_FROM
      ) {
        return new EmailAdapter();
      }
      console.log("[notifications] EMAIL_SMTP_* not set — falling back to console adapter");
      return new ConsoleAdapter("EMAIL");
    default:
      return new ConsoleAdapter(channel);
  }
}

export type SendNotificationInput = {
  channel: NotificationChannel;
  event: NotificationEvent;
  recipient: string;
  data: TemplateData;
  refType?: string;
  refId?: string;
};

export type SendNotificationResult = {
  success: boolean;
  error?: string;
  logId: string;
};

/**
 * The single entry point every module should call to notify a
 * customer/staff member. Renders the event's template, sends it through
 * whichever adapter `getAdapter` resolves to, and always persists the
 * outcome to `notificationLog` — regardless of whether the send succeeded.
 */
export async function sendNotification(
  input: SendNotificationInput
): Promise<SendNotificationResult> {
  const template = NOTIFICATION_TEMPLATES[input.event](input.data);
  const adapter = getAdapter(input.channel);

  let result: { success: boolean; error?: string };
  try {
    result = await adapter.send({
      recipient: input.recipient,
      subject: template.subject,
      body: template.body,
    });
  } catch (err) {
    result = {
      success: false,
      error: err instanceof Error ? err.message : "Unknown notification send error",
    };
  }

  const [row] = await db
    .insert(notificationLog)
    .values({
      channel: input.channel,
      event: input.event,
      recipient: input.recipient,
      subject: template.subject,
      body: template.body,
      status: result.success ? "SENT" : "FAILED",
      errorMessage: result.error,
      refType: input.refType,
      refId: input.refId,
      sentAt: result.success ? new Date() : null,
    })
    .returning({ id: notificationLog.id });

  return { success: result.success, error: result.error, logId: row.id };
}

export type {
  NotificationAdapter,
  NotificationChannel,
  NotificationEvent,
  TemplateData,
} from "./types";
