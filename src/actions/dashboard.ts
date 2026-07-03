"use server";

import { and, desc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  alteration,
  bridalOrder,
  customer,
  inventory,
  product,
  productVariant,
  sale,
  saleItem,
  storeSettings,
  user,
} from "@/db/schema";
import { requirePermission } from "@/lib/session";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardStats() {
  const currentUser = await requirePermission("dashboard:view");
  if (!currentUser.storeId) {
    throw new Error("No store associated with this account");
  }
  const storeId = currentUser.storeId;

  const today = startOfToday();
  const monthStart = startOfMonth();

  const [
    [todaySales],
    [monthSales],
    [customerCount],
    [lowStockRow],
    [settingsRow],
    [pendingAlterations],
    [activeBridalOrders],
    bestSellers,
    recentSales,
    dailySeries,
    [profitRow],
  ] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(${sale.totalAmount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(sale)
      .where(and(eq(sale.storeId, storeId), gte(sale.createdAt, today), ne(sale.status, "VOID"))),

    db
      .select({
        total: sql<string>`coalesce(sum(${sale.totalAmount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(sale)
      .where(
        and(eq(sale.storeId, storeId), gte(sale.createdAt, monthStart), ne(sale.status, "VOID"))
      ),

    db.select({ count: sql<number>`count(*)::int` }).from(customer),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventory)
      .where(and(eq(inventory.storeId, storeId), eq(inventory.quantity, 0))),

    db.select().from(storeSettings).where(eq(storeSettings.storeId, storeId)),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(alteration)
      .where(and(eq(alteration.storeId, storeId), ne(alteration.status, "DELIVERED"))),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(bridalOrder)
      .where(and(eq(bridalOrder.storeId, storeId), ne(bridalOrder.status, "DELIVERED"))),

    db
      .select({
        productName: product.name,
        articleCode: product.articleCode,
        totalQuantity: sql<number>`sum(${saleItem.quantity})::int`,
        totalRevenue: sql<string>`sum(${saleItem.lineTotal})`,
      })
      .from(saleItem)
      .innerJoin(sale, eq(saleItem.saleId, sale.id))
      .innerJoin(productVariant, eq(saleItem.variantId, productVariant.id))
      .innerJoin(product, eq(productVariant.productId, product.id))
      .where(and(eq(sale.storeId, storeId), ne(sale.status, "VOID")))
      .groupBy(product.id, product.name, product.articleCode)
      .orderBy(desc(sql`sum(${saleItem.quantity})`))
      .limit(5),

    db
      .select({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        totalAmount: sale.totalAmount,
        status: sale.status,
        createdAt: sale.createdAt,
        customerName: customer.name,
        cashierName: user.name,
      })
      .from(sale)
      .leftJoin(customer, eq(sale.customerId, customer.id))
      .leftJoin(user, eq(sale.cashierId, user.id))
      .where(eq(sale.storeId, storeId))
      .orderBy(desc(sale.createdAt))
      .limit(8),

    db
      .select({
        day: sql<string>`to_char(${sale.createdAt}, 'YYYY-MM-DD')`,
        total: sql<string>`sum(${sale.totalAmount})`,
      })
      .from(sale)
      .where(
        and(
          eq(sale.storeId, storeId),
          gte(sale.createdAt, sql`now() - interval '13 days'`),
          ne(sale.status, "VOID")
        )
      )
      .groupBy(sql`to_char(${sale.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${sale.createdAt}, 'YYYY-MM-DD')`),

    db
      .select({
        revenue: sql<string>`coalesce(sum(${saleItem.lineTotal}), 0)`,
        cost: sql<string>`coalesce(sum(${saleItem.quantity} * ${product.purchaseCost}), 0)`,
      })
      .from(saleItem)
      .innerJoin(sale, eq(saleItem.saleId, sale.id))
      .innerJoin(productVariant, eq(saleItem.variantId, productVariant.id))
      .innerJoin(product, eq(productVariant.productId, product.id))
      .where(
        and(eq(sale.storeId, storeId), gte(sale.createdAt, monthStart), ne(sale.status, "VOID"))
      ),
  ]);

  const lowStockThreshold = Number(settingsRow?.lowStockThreshold ?? 5);
  const [lowStockCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventory)
    .where(
      and(
        eq(inventory.storeId, storeId),
        gte(inventory.quantity, 1),
        lt(inventory.quantity, lowStockThreshold)
      )
    );

  const revenue = Number(profitRow?.revenue ?? 0);
  const cost = Number(profitRow?.cost ?? 0);

  // Build a complete 14-day series (fill in days with zero sales).
  const seriesMap = new Map(dailySeries.map((d) => [d.day, Number(d.total)]));
  const chartData: { date: string; sales: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    chartData.push({ date: key, sales: seriesMap.get(key) ?? 0 });
  }

  return {
    todaySales: { total: Number(todaySales.total), count: todaySales.count },
    monthSales: { total: Number(monthSales.total), count: monthSales.count },
    customerCount: customerCount.count,
    lowStockCount: lowStockCountRow.count,
    outOfStockCount: lowStockRow.count,
    pendingAlterations: pendingAlterations.count,
    activeBridalOrders: activeBridalOrders.count,
    monthProfit: revenue - cost,
    monthRevenue: revenue,
    bestSellers: bestSellers.map((b) => ({
      ...b,
      totalRevenue: Number(b.totalRevenue),
    })),
    recentSales,
    chartData,
  };
}
