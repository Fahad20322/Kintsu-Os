"use server";

import { and, desc, eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { customer, loyaltyTier, loyaltyTransaction } from "@/db/schema";
import { requirePermission } from "@/lib/session";
import {
  adjustLoyaltyPointsSchema,
  loyaltyTierSchema,
} from "@/lib/validations/loyalty";

export async function listLoyaltyTiers() {
  await requirePermission("loyalty:view");
  return db.select().from(loyaltyTier).orderBy(loyaltyTier.minSpend);
}

export async function createLoyaltyTier(rawInput: unknown) {
  await requirePermission("loyalty:manage");
  const input = loyaltyTierSchema.parse(rawInput);
  const [row] = await db
    .insert(loyaltyTier)
    .values({
      name: input.name,
      minSpend: String(input.minSpend),
      pointsMultiplier: String(input.pointsMultiplier),
      benefits: input.benefits,
    })
    .returning();
  revalidatePath("/loyalty");
  return row;
}

export async function updateLoyaltyTier(id: string, rawInput: unknown) {
  await requirePermission("loyalty:manage");
  const input = loyaltyTierSchema.parse(rawInput);
  const [row] = await db
    .update(loyaltyTier)
    .set({
      name: input.name,
      minSpend: String(input.minSpend),
      pointsMultiplier: String(input.pointsMultiplier),
      benefits: input.benefits,
    })
    .where(eq(loyaltyTier.id, id))
    .returning();
  revalidatePath("/loyalty");
  return row;
}

export async function listCustomersByTier() {
  await requirePermission("loyalty:view");

  const [customers, tiers] = await Promise.all([
    db
      .select({
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        totalSpend: customer.totalSpend,
        loyaltyPoints: customer.loyaltyPoints,
        loyaltyTierId: customer.loyaltyTierId,
        tierName: loyaltyTier.name,
      })
      .from(customer)
      .leftJoin(loyaltyTier, eq(customer.loyaltyTierId, loyaltyTier.id))
      .orderBy(desc(customer.totalSpend)),
    db.select().from(loyaltyTier).orderBy(desc(loyaltyTier.minSpend)),
  ]);

  return customers.map((c) => {
    const spend = Number(c.totalSpend);
    const suggestedTier = tiers.find((t) => spend >= Number(t.minSpend));
    return {
      ...c,
      suggestedTierId: suggestedTier?.id ?? null,
      suggestedTierName: suggestedTier?.name ?? null,
    };
  });
}

export async function assignCustomerTier(customerId: string, tierId: string | null) {
  await requirePermission("loyalty:manage");
  await db.update(customer).set({ loyaltyTierId: tierId }).where(eq(customer.id, customerId));
  revalidatePath("/loyalty");
}

export async function adjustLoyaltyPoints(rawInput: unknown) {
  const currentUser = await requirePermission("loyalty:manage");
  const input = adjustLoyaltyPointsSchema.parse(rawInput);

  await db.transaction(async (tx) => {
    await tx
      .update(customer)
      .set({ loyaltyPoints: sql`${customer.loyaltyPoints} + ${input.points}` })
      .where(eq(customer.id, input.customerId));

    await tx.insert(loyaltyTransaction).values({
      customerId: input.customerId,
      points: input.points,
      type: "ADJUST",
      note: input.note ?? `Manual adjustment by staff (${currentUser.name})`,
    });
  });

  revalidatePath("/loyalty");
}

export async function listUpcomingBirthdays(daysAhead = 30) {
  await requirePermission("loyalty:view");

  const today = new Date();
  const todayKey = today.toISOString().slice(5, 10);
  const future = new Date(today);
  future.setDate(future.getDate() + daysAhead);
  const futureKey = future.toISOString().slice(5, 10);

  const wraps = futureKey < todayKey;

  const rows = wraps
    ? await db
        .select({
          id: customer.id,
          name: customer.name,
          mobile: customer.mobile,
          birthday: customer.birthday,
        })
        .from(customer)
        .where(
          and(
            sql`${customer.birthday} is not null`,
            or(
              sql`to_char(${customer.birthday}, 'MM-DD') >= ${todayKey}`,
              sql`to_char(${customer.birthday}, 'MM-DD') <= ${futureKey}`
            )
          )
        )
    : await db
        .select({
          id: customer.id,
          name: customer.name,
          mobile: customer.mobile,
          birthday: customer.birthday,
        })
        .from(customer)
        .where(
          and(
            sql`${customer.birthday} is not null`,
            sql`to_char(${customer.birthday}, 'MM-DD') >= ${todayKey}`,
            sql`to_char(${customer.birthday}, 'MM-DD') <= ${futureKey}`
          )
        );

  return rows;
}

export async function listLoyaltyTransactions(customerId: string) {
  await requirePermission("loyalty:view");
  return db
    .select()
    .from(loyaltyTransaction)
    .where(eq(loyaltyTransaction.customerId, customerId))
    .orderBy(desc(loyaltyTransaction.createdAt));
}
