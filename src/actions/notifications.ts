"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notificationLog } from "@/db/schema";
import { requirePermission, requireUser } from "@/lib/session";
import { sendNotification, type NotificationChannel, type NotificationEvent } from "@/lib/notifications";
import { triggerNotificationSchema } from "@/lib/validations/notifications";

export async function listNotificationLog(params?: { channel?: string; event?: string }) {
  await requireUser();

  const conditions = [];
  if (params?.channel) {
    conditions.push(eq(notificationLog.channel, params.channel as NotificationChannel));
  }
  if (params?.event) {
    conditions.push(eq(notificationLog.event, params.event as NotificationEvent));
  }

  return db
    .select()
    .from(notificationLog)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(notificationLog.createdAt))
    .limit(100);
}

export async function triggerNotification(rawInput: unknown) {
  await requirePermission("settings:manage");
  const input = triggerNotificationSchema.parse(rawInput);

  const result = await sendNotification({
    channel: input.channel,
    event: input.event,
    recipient: input.recipient,
    data: input.data,
    refType: "MANUAL",
  });

  revalidatePath("/notifications");
  return result;
}
