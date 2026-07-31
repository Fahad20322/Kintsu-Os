import "server-only";
import { headers } from "next/headers";
import { db } from "@/db";
import { auditLog } from "@/db/schema";

/**
 * Writes one row to audit_log, capturing user/store/device/IP/time — the
 * fields the spec calls for on every tracked action (login, logout, edit
 * product, delete product, price change, purchase, billing, return,
 * exchange, ...). Safe to call from a request-scoped server action or an
 * event-bus subscriber running within one; falls back to no device info
 * outside a request (e.g. a future background job).
 */
export async function logAudit(entry: {
  userId?: string | null;
  storeId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  let ipAddress: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
    userAgent = h.get("user-agent");
  } catch {
    // headers() throws outside a request scope; the audit row is still
    // written, just without device info.
  }

  await db.insert(auditLog).values({
    userId: entry.userId ?? null,
    storeId: entry.storeId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    ipAddress,
    userAgent,
  });
}
