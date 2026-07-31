"use server";

import { headers } from "next/headers";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";

export async function listMySessions() {
  await requireUser();
  const h = await headers();

  const [current, sessions] = await Promise.all([
    auth.api.getSession({ headers: h }),
    auth.api.listSessions({ headers: h }),
  ]);

  return sessions
    .map((s) => ({
      id: s.id,
      token: s.token,
      ipAddress: s.ipAddress ?? null,
      userAgent: s.userAgent ?? null,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: current?.session.token === s.token,
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function revokeMySession(token: string) {
  await requireUser();
  const h = await headers();
  await auth.api.revokeSession({ body: { token }, headers: h });
}

export async function getMyLoginHistory(limit = 20) {
  const user = await requireUser();
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(and(inArray(auditLog.action, ["LOGIN", "LOGOUT"]), eq(auditLog.userId, user.id)))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
