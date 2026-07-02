import { sql } from "drizzle-orm";
import { db } from "@/db";
import { storeSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Atomically reserves and returns the next invoice number for a store, e.g. INV-000123. */
export async function nextInvoiceNumber(storeId: string): Promise<string> {
  const rows = await db
    .update(storeSettings)
    .set({ invoiceNextNumber: sql`${storeSettings.invoiceNextNumber} + 1` })
    .where(eq(storeSettings.storeId, storeId))
    .returning({
      prefix: storeSettings.invoicePrefix,
      next: storeSettings.invoiceNextNumber,
    });

  const settings = rows[0];
  const number = settings ? Number(settings.next) - 1 : 1;
  const prefix = settings?.prefix ?? "INV";
  return `${prefix}-${String(number).padStart(6, "0")}`;
}

let poCounter = 0;
export function nextPoNumber(): string {
  poCounter += 1;
  return `PO-${Date.now().toString(36).toUpperCase()}${poCounter}`;
}

export function nextGrnNumber(): string {
  return `GRN-${Date.now().toString(36).toUpperCase()}${Math.floor(
    Math.random() * 900 + 100
  )}`;
}

export function nextJobNumber(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(
    Math.random() * 900 + 100
  )}`;
}
