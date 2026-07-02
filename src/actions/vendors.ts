"use server";

import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { purchaseOrder, vendor, vendorPayment } from "@/db/schema";
import { requirePermission } from "@/lib/session";
import { vendorPaymentSchema, vendorSchema } from "@/lib/validations/vendor";

export async function listVendors(search?: string) {
  await requirePermission("vendors:view");

  const where = search
    ? or(
        ilike(vendor.name, `%${search}%`),
        ilike(vendor.contactPerson, `%${search}%`),
        ilike(vendor.mobile, `%${search}%`)
      )
    : undefined;

  return db.select().from(vendor).where(where).orderBy(desc(vendor.createdAt));
}

export async function createVendor(rawInput: unknown) {
  await requirePermission("vendors:manage");
  const input = vendorSchema.parse(rawInput);

  const [created] = await db
    .insert(vendor)
    .values({
      name: input.name,
      contactPerson: input.contactPerson || null,
      mobile: input.mobile || null,
      email: input.email || null,
      address: input.address || null,
      gstin: input.gstin || null,
      openingBalance: String(input.openingBalance),
    })
    .returning();

  revalidatePath("/vendors");
  return created;
}

export async function getVendor(id: string) {
  await requirePermission("vendors:view");

  const [vendorRow] = await db.select().from(vendor).where(eq(vendor.id, id));
  if (!vendorRow) return null;

  const [purchaseOrders, payments] = await Promise.all([
    db
      .select()
      .from(purchaseOrder)
      .where(eq(purchaseOrder.vendorId, id))
      .orderBy(desc(purchaseOrder.createdAt)),
    db
      .select()
      .from(vendorPayment)
      .where(eq(vendorPayment.vendorId, id))
      .orderBy(desc(vendorPayment.createdAt)),
  ]);

  const [[{ totalOrdered }], [{ totalPaid }]] = await Promise.all([
    db
      .select({ totalOrdered: sql<string>`coalesce(sum(${purchaseOrder.totalAmount}), 0)` })
      .from(purchaseOrder)
      .where(and(eq(purchaseOrder.vendorId, id), ne(purchaseOrder.status, "CANCELLED"))),
    db
      .select({ totalPaid: sql<string>`coalesce(sum(${vendorPayment.amount}), 0)` })
      .from(vendorPayment)
      .where(eq(vendorPayment.vendorId, id)),
  ]);

  const pendingBalance =
    Number(vendorRow.openingBalance) + Number(totalOrdered) - Number(totalPaid);

  return {
    vendor: vendorRow,
    pendingBalance,
    purchaseOrders,
    payments,
  };
}

export async function recordVendorPayment(rawInput: unknown) {
  await requirePermission("vendors:manage");
  const input = vendorPaymentSchema.parse(rawInput);

  const [created] = await db
    .insert(vendorPayment)
    .values({
      vendorId: input.vendorId,
      purchaseOrderId: input.purchaseOrderId || null,
      amount: String(input.amount),
      method: input.method,
      referenceNumber: input.referenceNumber || null,
      note: input.note || null,
    })
    .returning();

  revalidatePath(`/vendors/${input.vendorId}`);
  revalidatePath("/vendors");
  return created;
}
