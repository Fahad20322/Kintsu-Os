import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";
import { notificationChannelEnum, notificationEventEnum, notificationStatusEnum } from "./enums";

export const notificationLog = pgTable("notification_log", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  channel: notificationChannelEnum("channel").notNull(),
  event: notificationEventEnum("event").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  status: notificationStatusEnum("status").notNull().default("PENDING"),
  errorMessage: text("error_message"),
  refType: text("ref_type"),
  refId: text("ref_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
});
