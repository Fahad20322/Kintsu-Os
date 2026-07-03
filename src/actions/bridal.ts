"use server";

import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  bridalOrder,
  bridalPayment,
  bridalTimelineEvent,
  bridalTrial,
  customer,
  tailor,
} from "@/db/schema";
import { requirePermission } from "@/lib/session";
import {
  bridalOrderSchema,
  bridalPaymentSchema,
  bridalTrialSchema,
  bridalOutfitStatusValues,
  type MeasurementsInput,
} from "@/lib/validations/bridal";

function parseMeasurements(raw: string | null): MeasurementsInput {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as MeasurementsInput;
  } catch {
    return {};
  }
}

export async function listBridalOrders(params: { search?: string; status?: string }) {
  await requirePermission("bridal:view");

  const conditions = [];
  if (params.search) {
    conditions.push(
      or(
        ilike(bridalOrder.brideName, `%${params.search}%`),
        ilike(bridalOrder.groomName, `%${params.search}%`),
        ilike(bridalOrder.brideMobile, `%${params.search}%`)
      )
    );
  }
  if (params.status) {
    conditions.push(
      eq(
        bridalOrder.status,
        params.status as (typeof bridalOutfitStatusValues)[number]
      )
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({ order: bridalOrder, customer, tailor })
    .from(bridalOrder)
    .leftJoin(customer, eq(bridalOrder.customerId, customer.id))
    .leftJoin(tailor, eq(bridalOrder.tailorId, tailor.id))
    .where(where)
    .orderBy(asc(bridalOrder.weddingDate));

  const orderIds = rows.map((r) => r.order.id);
  const paymentTotals = orderIds.length
    ? await db
        .select({
          bridalOrderId: bridalPayment.bridalOrderId,
          total: sql<string>`coalesce(sum(${bridalPayment.amount}), 0)`,
        })
        .from(bridalPayment)
        .where(inArray(bridalPayment.bridalOrderId, orderIds))
        .groupBy(bridalPayment.bridalOrderId)
    : [];
  const paymentTotalMap = new Map(
    paymentTotals.map((p) => [p.bridalOrderId, Number(p.total)])
  );

  return rows.map((r) => {
    const paid = Number(r.order.advancePaid) + (paymentTotalMap.get(r.order.id) ?? 0);
    return {
      ...r.order,
      customer: r.customer,
      tailor: r.tailor,
      pendingAmount: Number(r.order.totalAmount) - paid,
    };
  });
}

export async function getBridalOrder(id: string) {
  await requirePermission("bridal:view");

  const [row] = await db
    .select({ order: bridalOrder, customer, tailor })
    .from(bridalOrder)
    .leftJoin(customer, eq(bridalOrder.customerId, customer.id))
    .leftJoin(tailor, eq(bridalOrder.tailorId, tailor.id))
    .where(eq(bridalOrder.id, id));

  if (!row) return null;

  const [trials, timeline, payments] = await Promise.all([
    db
      .select()
      .from(bridalTrial)
      .where(eq(bridalTrial.bridalOrderId, id))
      .orderBy(asc(bridalTrial.trialDate)),
    db
      .select()
      .from(bridalTimelineEvent)
      .where(eq(bridalTimelineEvent.bridalOrderId, id))
      .orderBy(asc(bridalTimelineEvent.createdAt)),
    db
      .select()
      .from(bridalPayment)
      .where(eq(bridalPayment.bridalOrderId, id))
      .orderBy(asc(bridalPayment.createdAt)),
  ]);

  const paymentsTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAmount =
    Number(row.order.totalAmount) - Number(row.order.advancePaid) - paymentsTotal;

  return {
    ...row.order,
    measurements: parseMeasurements(row.order.measurements),
    customer: row.customer,
    tailor: row.tailor,
    trials,
    timeline,
    payments,
    paymentsTotal,
    pendingAmount,
  };
}

export async function createBridalOrder(rawInput: unknown) {
  const user = await requirePermission("bridal:manage");
  const input = bridalOrderSchema.parse(rawInput);
  if (!user.storeId) throw new Error("No store associated with this account");

  const created = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(bridalOrder)
      .values({
        storeId: user.storeId!,
        customerId: input.customerId || null,
        brideName: input.brideName,
        brideMobile: input.brideMobile || null,
        groomName: input.groomName || null,
        groomMobile: input.groomMobile || null,
        weddingDate: input.weddingDate,
        outfitDescription: input.outfitDescription,
        fabric: input.fabric || null,
        embroideryDetails: input.embroideryDetails || null,
        measurements: JSON.stringify(input.measurements ?? {}),
        tailorId: input.tailorId || null,
        status: "SELECTION",
        totalAmount: String(input.totalAmount),
        advancePaid: String(input.advancePaid),
        deliveryDate: input.deliveryDate || null,
        notes: input.notes || null,
      })
      .returning();

    await tx.insert(bridalTimelineEvent).values({
      bridalOrderId: order.id,
      status: "SELECTION",
      note: "Bridal order created",
      createdById: user.id,
    });

    return order;
  });

  revalidatePath("/bridal");
  return created;
}

export async function updateBridalOrder(id: string, rawInput: unknown) {
  await requirePermission("bridal:manage");
  const input = bridalOrderSchema
    .omit({ customerId: true, brideName: true, weddingDate: true })
    .partial()
    .parse(rawInput);

  const [updated] = await db
    .update(bridalOrder)
    .set({
      outfitDescription: input.outfitDescription,
      fabric: input.fabric || null,
      embroideryDetails: input.embroideryDetails || null,
      tailorId: input.tailorId || null,
      totalAmount:
        input.totalAmount !== undefined ? String(input.totalAmount) : undefined,
      deliveryDate: input.deliveryDate || null,
      measurements: input.measurements
        ? JSON.stringify(input.measurements)
        : undefined,
      notes: input.notes || null,
    })
    .where(eq(bridalOrder.id, id))
    .returning();

  revalidatePath("/bridal");
  revalidatePath(`/bridal/${id}`);
  return updated;
}

export async function updateBridalStatus(
  id: string,
  status: (typeof bridalOutfitStatusValues)[number],
  note?: string
) {
  const user = await requirePermission("bridal:manage");

  await db.transaction(async (tx) => {
    await tx
      .update(bridalOrder)
      .set({
        status,
        actualDeliveryDate:
          status === "DELIVERED"
            ? new Date().toISOString().slice(0, 10)
            : undefined,
      })
      .where(eq(bridalOrder.id, id));

    await tx.insert(bridalTimelineEvent).values({
      bridalOrderId: id,
      status,
      note: note || null,
      createdById: user.id,
    });
  });

  revalidatePath("/bridal");
  revalidatePath(`/bridal/${id}`);
}

export async function addBridalTrial(bridalOrderId: string, rawInput: unknown) {
  await requirePermission("bridal:manage");
  const input = bridalTrialSchema.parse(rawInput);

  const [created] = await db
    .insert(bridalTrial)
    .values({
      bridalOrderId,
      trialDate: new Date(input.trialDate),
      outcome: input.outcome || null,
    })
    .returning();

  revalidatePath(`/bridal/${bridalOrderId}`);
  return created;
}

export async function recordBridalPayment(bridalOrderId: string, rawInput: unknown) {
  await requirePermission("bridal:manage");
  const input = bridalPaymentSchema.parse(rawInput);

  const [created] = await db
    .insert(bridalPayment)
    .values({
      bridalOrderId,
      amount: String(input.amount),
      method: input.method,
      note: input.note || null,
    })
    .returning();

  revalidatePath(`/bridal/${bridalOrderId}`);
  return created;
}
