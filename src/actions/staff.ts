"use server";

import { headers } from "next/headers";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auditLog, sale, staffAttendance, staffTarget, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/session";
import {
  createStaffAccountSchema,
  markAttendanceSchema,
  setStaffTargetSchema,
} from "@/lib/validations/staff";

function startOfMonth(monthStr?: string) {
  const d = monthStr ? new Date(`${monthStr.slice(0, 7)}-01T00:00:00`) : new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(monthStr?: string) {
  const d = startOfMonth(monthStr);
  d.setMonth(d.getMonth() + 1);
  return d;
}

export async function listStaff() {
  const currentUser = await requirePermission("staff:view");
  if (!currentUser.storeId) return [];

  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();

  const staff = await db
    .select()
    .from(user)
    .where(eq(user.storeId, currentUser.storeId))
    .orderBy(user.name);

  const salesByUser = await db
    .select({
      cashierId: sale.cashierId,
      total: sql<string>`coalesce(sum(${sale.totalAmount}), 0)`,
    })
    .from(sale)
    .where(
      and(eq(sale.storeId, currentUser.storeId), gte(sale.createdAt, monthStart), sql`${sale.createdAt} < ${monthEnd}`)
    )
    .groupBy(sale.cashierId);

  const salesMap = new Map(salesByUser.map((s) => [s.cashierId, Number(s.total)]));

  return staff.map((s) => ({ ...s, monthSales: salesMap.get(s.id) ?? 0 }));
}

export async function createStaffAccount(rawInput: unknown) {
  const currentUser = await requirePermission("users:manage");
  const input = createStaffAccountSchema.parse(rawInput);
  if (!currentUser.storeId) throw new Error("No store associated with this account");

  let created;
  try {
    created = await auth.api.signUpEmail({
      body: { name: input.name, email: input.email, password: input.password },
      headers: await headers(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create account";
    if (message.toLowerCase().includes("already exist") || message.toLowerCase().includes("unique")) {
      throw new Error("An account with this email already exists");
    }
    throw new Error(message);
  }

  await db
    .update(user)
    .set({ role: input.role, storeId: currentUser.storeId, phone: input.phone })
    .where(eq(user.id, created.user.id));

  await db.insert(auditLog).values({
    userId: currentUser.id,
    action: "CREATE_STAFF_ACCOUNT",
    entityType: "user",
    entityId: created.user.id,
    metadata: JSON.stringify({ role: input.role }),
  });

  revalidatePath("/staff");
  return created.user;
}

export async function markAttendance(rawInput: unknown) {
  await requirePermission("staff:manage");
  const input = markAttendanceSchema.parse(rawInput);

  const [existing] = await db
    .select()
    .from(staffAttendance)
    .where(and(eq(staffAttendance.userId, input.userId), eq(staffAttendance.date, input.date)));

  if (existing) {
    await db
      .update(staffAttendance)
      .set({ status: input.status, note: input.note })
      .where(eq(staffAttendance.id, existing.id));
  } else {
    await db.insert(staffAttendance).values({
      userId: input.userId,
      date: input.date,
      status: input.status,
      note: input.note,
    });
  }

  revalidatePath("/staff/attendance");
}

export async function listAttendance(date: string) {
  await requirePermission("staff:view");
  return db
    .select({
      userId: staffAttendance.userId,
      status: staffAttendance.status,
      note: staffAttendance.note,
    })
    .from(staffAttendance)
    .where(eq(staffAttendance.date, date));
}

export async function setStaffTarget(rawInput: unknown) {
  const currentUser = await requirePermission("staff:manage");
  const input = setStaffTargetSchema.parse(rawInput);
  if (!currentUser.storeId) throw new Error("No store associated with this account");

  const periodMonth = `${input.periodMonth.slice(0, 7)}-01`;

  const [existing] = await db
    .select()
    .from(staffTarget)
    .where(and(eq(staffTarget.userId, input.userId), eq(staffTarget.periodMonth, periodMonth)));

  if (existing) {
    await db
      .update(staffTarget)
      .set({ targetAmount: String(input.targetAmount) })
      .where(eq(staffTarget.id, existing.id));
  } else {
    await db.insert(staffTarget).values({
      userId: input.userId,
      storeId: currentUser.storeId,
      periodMonth,
      targetAmount: String(input.targetAmount),
    });
  }

  revalidatePath("/staff/targets");
}

export async function listStaffTargets(periodMonth?: string) {
  const currentUser = await requirePermission("staff:view");
  if (!currentUser.storeId) return [];

  const monthKey = periodMonth ? `${periodMonth.slice(0, 7)}-01` : startOfMonth().toISOString().slice(0, 10);
  const monthStart = startOfMonth(monthKey);
  const monthEnd = endOfMonth(monthKey);

  const targets = await db
    .select({
      id: staffTarget.id,
      userId: staffTarget.userId,
      userName: user.name,
      targetAmount: staffTarget.targetAmount,
    })
    .from(staffTarget)
    .innerJoin(user, eq(staffTarget.userId, user.id))
    .where(and(eq(staffTarget.storeId, currentUser.storeId), eq(staffTarget.periodMonth, monthKey)));

  const salesByUser = await db
    .select({
      cashierId: sale.cashierId,
      total: sql<string>`coalesce(sum(${sale.totalAmount}), 0)`,
    })
    .from(sale)
    .where(
      and(
        eq(sale.storeId, currentUser.storeId),
        gte(sale.createdAt, monthStart),
        sql`${sale.createdAt} < ${monthEnd}`
      )
    )
    .groupBy(sale.cashierId);

  const salesMap = new Map(salesByUser.map((s) => [s.cashierId, Number(s.total)]));

  return targets.map((t) => ({
    ...t,
    achievedAmount: salesMap.get(t.userId) ?? 0,
  }));
}

export async function listAuditLog(limit = 100) {
  await requirePermission("staff:view");
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
      userName: user.name,
    })
    .from(auditLog)
    .leftJoin(user, eq(auditLog.userId, user.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
