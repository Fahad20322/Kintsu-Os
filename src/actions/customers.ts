"use server";

import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  category,
  customer,
  loyaltyTier,
  product,
  productVariant,
  sale,
  saleItem,
} from "@/db/schema";
import { requirePermission } from "@/lib/session";
import { customerSchema, customerUpdateSchema } from "@/lib/validations/customer";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}

export async function listCustomers(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  await requirePermission("customers:view");
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  const where = params.search
    ? or(
        ilike(customer.name, `%${params.search}%`),
        ilike(customer.mobile, `%${params.search}%`)
      )
    : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(customer)
      .where(where)
      .orderBy(desc(customer.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(customer).where(where),
  ]);

  return { rows, total: count, page, pageSize };
}

export async function getCustomer(id: string) {
  await requirePermission("customers:view");
  const [row] = await db
    .select({ customer, loyaltyTier })
    .from(customer)
    .leftJoin(loyaltyTier, eq(customer.loyaltyTierId, loyaltyTier.id))
    .where(eq(customer.id, id));

  if (!row) return null;
  return { ...row.customer, loyaltyTier: row.loyaltyTier };
}

export async function createCustomer(rawInput: unknown) {
  await requirePermission("customers:manage");
  const input = customerSchema.parse(rawInput);

  try {
    const [created] = await db
      .insert(customer)
      .values({
        name: input.name,
        mobile: input.mobile,
        email: input.email || null,
        address: input.address || null,
        city: input.city || null,
        birthday: input.birthday || null,
        anniversary: input.anniversary || null,
        preferredSize: input.preferredSize || null,
        notes: input.notes || null,
      })
      .returning();

    revalidatePath("/customers");
    return created;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new Error("A customer with this mobile number already exists");
    }
    throw err;
  }
}

export async function updateCustomer(id: string, rawInput: unknown) {
  await requirePermission("customers:manage");
  const input = customerUpdateSchema.parse(rawInput);

  const values: Partial<typeof customer.$inferInsert> = {};
  if (input.name !== undefined) values.name = input.name;
  if (input.mobile !== undefined) values.mobile = input.mobile;
  if (input.email !== undefined) values.email = input.email || null;
  if (input.address !== undefined) values.address = input.address || null;
  if (input.city !== undefined) values.city = input.city || null;
  if (input.birthday !== undefined) values.birthday = input.birthday || null;
  if (input.anniversary !== undefined) values.anniversary = input.anniversary || null;
  if (input.preferredSize !== undefined) values.preferredSize = input.preferredSize || null;
  if (input.notes !== undefined) values.notes = input.notes || null;

  try {
    const [updated] = await db
      .update(customer)
      .set(values)
      .where(eq(customer.id, id))
      .returning();

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return updated;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new Error("A customer with this mobile number already exists");
    }
    throw err;
  }
}

export async function getCustomerPurchaseHistory(customerId: string) {
  await requirePermission("customers:view");
  const rows = await db
    .select({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      totalAmount: sale.totalAmount,
      status: sale.status,
      createdAt: sale.createdAt,
    })
    .from(sale)
    .where(eq(sale.customerId, customerId))
    .orderBy(desc(sale.createdAt));

  return rows;
}

export async function getCustomerFavoriteCategories(customerId: string) {
  await requirePermission("customers:view");
  const rows = await db
    .select({
      categoryName: category.name,
      qty: sql<number>`sum(${saleItem.quantity})::int`,
    })
    .from(sale)
    .innerJoin(saleItem, eq(saleItem.saleId, sale.id))
    .innerJoin(productVariant, eq(productVariant.id, saleItem.variantId))
    .innerJoin(product, eq(product.id, productVariant.productId))
    .innerJoin(category, eq(category.id, product.categoryId))
    .where(eq(sale.customerId, customerId))
    .groupBy(category.name)
    .orderBy(desc(sql`sum(${saleItem.quantity})`))
    .limit(3);

  return rows;
}
