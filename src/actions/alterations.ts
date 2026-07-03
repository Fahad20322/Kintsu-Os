"use server";

import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { alteration, alterationStatusHistory, customer, tailor } from "@/db/schema";
import { requirePermission } from "@/lib/session";
import { nextJobNumber } from "@/lib/numbering";
import {
  alterationSchema,
  alterationStatusValues,
  updateAlterationStatusSchema,
} from "@/lib/validations/alteration";

type AlterationStatus = (typeof alterationStatusValues)[number];

export async function listAlterations(params: { search?: string; status?: string }) {
  await requirePermission("alterations:view");

  const conditions = [];
  if (params.search) {
    conditions.push(
      or(
        ilike(alteration.jobNumber, `%${params.search}%`),
        ilike(customer.name, `%${params.search}%`),
        ilike(customer.mobile, `%${params.search}%`)
      )
    );
  }
  if (params.status) {
    conditions.push(eq(alteration.status, params.status as AlterationStatus));
  }

  return db
    .select({
      id: alteration.id,
      jobNumber: alteration.jobNumber,
      itemDescription: alteration.itemDescription,
      status: alteration.status,
      charge: alteration.charge,
      expectedDeliveryDate: alteration.expectedDeliveryDate,
      createdAt: alteration.createdAt,
      customerId: alteration.customerId,
      customerName: customer.name,
      customerMobile: customer.mobile,
      tailorId: alteration.tailorId,
      tailorName: tailor.name,
    })
    .from(alteration)
    .leftJoin(customer, eq(alteration.customerId, customer.id))
    .leftJoin(tailor, eq(alteration.tailorId, tailor.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(alteration.createdAt));
}

export async function getAlteration(id: string) {
  await requirePermission("alterations:view");

  const [row] = await db
    .select({
      alteration,
      customer,
      tailor,
    })
    .from(alteration)
    .leftJoin(customer, eq(alteration.customerId, customer.id))
    .leftJoin(tailor, eq(alteration.tailorId, tailor.id))
    .where(eq(alteration.id, id));

  if (!row) return null;

  const statusHistory = await db
    .select()
    .from(alterationStatusHistory)
    .where(eq(alterationStatusHistory.alterationId, id))
    .orderBy(asc(alterationStatusHistory.createdAt));

  return {
    ...row.alteration,
    customer: row.customer,
    tailor: row.tailor,
    statusHistory,
  };
}

/** Simple ilike search over customer name/mobile, for the new-alteration dialog's customer lookup. */
export async function searchCustomersForAlteration(query: string) {
  await requirePermission("alterations:manage");
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  return db
    .select({ id: customer.id, name: customer.name, mobile: customer.mobile })
    .from(customer)
    .where(or(ilike(customer.name, `%${trimmed}%`), ilike(customer.mobile, `%${trimmed}%`)))
    .limit(10);
}

export async function createAlteration(rawInput: unknown) {
  const user = await requirePermission("alterations:manage");
  const input = alterationSchema.parse(rawInput);
  if (!user.storeId) throw new Error("No store associated with this account");

  const created = await db.transaction(async (tx) => {
    const [createdAlteration] = await tx
      .insert(alteration)
      .values({
        storeId: user.storeId!,
        jobNumber: nextJobNumber("ALT"),
        customerId: input.customerId || null,
        itemDescription: input.itemDescription,
        alterationDetails: input.alterationDetails,
        tailorId: input.tailorId || null,
        status: "RECEIVED",
        charge: String(input.charge),
        expectedDeliveryDate: input.expectedDeliveryDate || null,
        receivedById: user.id,
      })
      .returning();

    await tx.insert(alterationStatusHistory).values({
      alterationId: createdAlteration.id,
      status: "RECEIVED",
      note: "Item received",
      changedById: user.id,
    });

    return createdAlteration;
  });

  revalidatePath("/alterations");
  return created;
}

/**
 * Updates the alteration's status and appends a status-history entry.
 *
 * Workflow-ordering decision: the status enum (RECEIVED -> ASSIGNED -> IN_PROGRESS
 * -> READY -> DELIVERED) is not strictly enforced here — any status can be set at
 * any time, since real-world edge cases (correcting a mistake, re-opening a
 * "delivered" job) are common enough that a hard state machine would just get in
 * the way. The one bit of automatic behavior: if a tailor is being assigned for
 * the first time (alteration.tailorId was null) while the caller leaves the
 * status at "RECEIVED", we auto-advance the status to "ASSIGNED" so the job list
 * doesn't get stuck showing "Received" after a tailor has clearly been assigned.
 * Any explicit status choice from the caller is always respected as-is.
 */
export async function updateAlterationStatus(
  id: string,
  status: AlterationStatus,
  note?: string,
  tailorId?: string
) {
  const user = await requirePermission("alterations:manage");
  const input = updateAlterationStatusSchema.parse({ status, note, tailorId });

  const updated = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(alteration).where(eq(alteration.id, id));
    if (!current) throw new Error("Alteration not found");

    const isNewTailorAssignment = Boolean(input.tailorId) && !current.tailorId;
    const effectiveStatus: AlterationStatus =
      isNewTailorAssignment && input.status === "RECEIVED" ? "ASSIGNED" : input.status;

    const [updatedAlteration] = await tx
      .update(alteration)
      .set({
        status: effectiveStatus,
        tailorId: input.tailorId || current.tailorId,
        actualDeliveryDate:
          effectiveStatus === "DELIVERED"
            ? new Date().toISOString().slice(0, 10)
            : current.actualDeliveryDate,
      })
      .where(eq(alteration.id, id))
      .returning();

    await tx.insert(alterationStatusHistory).values({
      alterationId: id,
      status: effectiveStatus,
      note: input.note || null,
      changedById: user.id,
    });

    return updatedAlteration;
  });

  revalidatePath("/alterations");
  revalidatePath(`/alterations/${id}`);
  return updated;
}
