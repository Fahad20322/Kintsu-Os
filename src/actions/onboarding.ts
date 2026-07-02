"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { store, storeSettings, user, warehouse } from "@/db/schema";
import { getCurrentSession } from "@/lib/session";

function slugifyCode(name: string) {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 6);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base || "STORE"}-${suffix}`;
}

export async function completeStoreOnboarding(input: { storeName: string }) {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("Not authenticated");
  }

  if (session.user.storeId) {
    return { storeId: session.user.storeId };
  }

  const [newStore] = await db
    .insert(store)
    .values({
      name: input.storeName,
      code: slugifyCode(input.storeName),
    })
    .returning();

  await db.insert(storeSettings).values({ storeId: newStore.id });

  await db.insert(warehouse).values({
    storeId: newStore.id,
    name: "Main Warehouse",
    isDefault: 1,
  });

  await db
    .update(user)
    .set({ role: "OWNER", storeId: newStore.id })
    .where(eq(user.id, session.user.id));

  return { storeId: newStore.id };
}
