"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tailor } from "@/db/schema";
import { requirePermission, requireUser } from "@/lib/session";
import { tailorSchema } from "@/lib/validations/alteration";

/**
 * Returns active tailors for the current user's store. Intentionally gated only
 * by `requireUser()` (not a specific permission) because both the Alterations
 * and Bridal modules need this list for simple assignment dropdowns — keep this
 * export's shape stable, Bridal depends on it.
 */
export async function listTailors() {
  const user = await requireUser();
  if (!user.storeId) return [];

  return db
    .select()
    .from(tailor)
    .where(and(eq(tailor.storeId, user.storeId), eq(tailor.isActive, true)))
    .orderBy(tailor.name);
}

export async function createTailor(rawInput: unknown) {
  const user = await requirePermission("alterations:manage");
  const input = tailorSchema.parse(rawInput);
  if (!user.storeId) throw new Error("No store associated with this account");

  const [created] = await db
    .insert(tailor)
    .values({
      storeId: user.storeId,
      name: input.name,
      mobile: input.mobile || null,
      specialization: input.specialization || null,
    })
    .returning();

  revalidatePath("/alterations");
  return created;
}
