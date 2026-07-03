import { and, desc, eq, gte, ilike, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  bridalOrder,
  customer,
  inventory,
  product,
  productVariant,
  sale,
  storeSettings,
} from "@/db/schema";
import type { ParsedQuery } from "./intent-parser";

export type HandlerResult = {
  answer: string;
  data?: Record<string, unknown>[];
};

export async function handleProductAvailability(
  query: ParsedQuery,
  storeId: string
): Promise<HandlerResult> {
  if (!query.searchTerm) {
    return { answer: "Tell me which product you're asking about, e.g. \"Do we have Rani Pink Lehenga in stock?\"" };
  }

  // Match on each word independently (AND'd together) rather than one
  // contiguous phrase, so "Rani Pink Lehenga" still finds "Rani Pink
  // Bridal Lehenga" even though the words aren't adjacent in the name.
  const words = query.searchTerm.split(/\s+/).filter(Boolean);
  const wordConditions = words.map((word) =>
    or(ilike(product.name, `%${word}%`), ilike(product.articleCode, `%${word}%`))
  );

  const rows = await db
    .select({
      productName: product.name,
      articleCode: product.articleCode,
      size: productVariant.size,
      color: productVariant.color,
      sku: productVariant.sku,
      quantity: sql<number>`coalesce(sum(${inventory.quantity}), 0)::int`,
    })
    .from(productVariant)
    .innerJoin(product, eq(productVariant.productId, product.id))
    .leftJoin(inventory, and(eq(inventory.variantId, productVariant.id), eq(inventory.storeId, storeId)))
    .where(and(...wordConditions))
    .groupBy(product.name, product.articleCode, productVariant.size, productVariant.color, productVariant.sku)
    .limit(20);

  if (rows.length === 0) {
    return { answer: `I couldn't find any product matching "${query.searchTerm}".` };
  }

  const total = rows.reduce((sum, r) => sum + r.quantity, 0);
  return {
    answer: `Found ${rows.length} variant(s) matching "${query.searchTerm}" with ${total} total unit(s) in stock.`,
    data: rows,
  };
}

export async function handleSalesSummary(
  query: ParsedQuery,
  storeId: string
): Promise<HandlerResult> {
  const period = query.period ?? "today";
  const start = new Date();
  if (period === "today") start.setHours(0, 0, 0, 0);
  if (period === "week") start.setDate(start.getDate() - 7);
  if (period === "month") start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${sale.totalAmount}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(sale)
    .where(and(eq(sale.storeId, storeId), gte(sale.createdAt, start), sql`${sale.status} != 'VOID'`));

  const label = period === "today" ? "today" : period === "week" ? "in the last 7 days" : "this month";
  return {
    answer: `${label[0].toUpperCase()}${label.slice(1)}, you made ${row.count} sale(s) totaling ₹${Number(row.total).toLocaleString("en-IN")}.`,
  };
}

export async function handleCustomerHistory(query: ParsedQuery): Promise<HandlerResult> {
  if (!query.phone && !query.searchTerm) {
    return { answer: "Give me a customer name or 10-digit mobile number to look up." };
  }

  const [cust] = await db
    .select()
    .from(customer)
    .where(
      query.phone
        ? eq(customer.mobile, query.phone)
        : ilike(customer.name, `%${query.searchTerm}%`)
    )
    .limit(1);

  if (!cust) {
    return { answer: "I couldn't find a customer matching that." };
  }

  return {
    answer: `${cust.name} (${cust.mobile}) has placed ${cust.totalOrders} order(s) totaling ₹${Number(
      cust.totalSpend
    ).toLocaleString("en-IN")}, and has ${cust.loyaltyPoints} loyalty points.`,
    data: [
      {
        name: cust.name,
        mobile: cust.mobile,
        totalOrders: cust.totalOrders,
        totalSpend: cust.totalSpend,
        loyaltyPoints: cust.loyaltyPoints,
      },
    ],
  };
}

export async function handleRestockSuggestions(storeId: string): Promise<HandlerResult> {
  const [settings] = await db
    .select({ lowStockThreshold: storeSettings.lowStockThreshold })
    .from(storeSettings)
    .where(eq(storeSettings.storeId, storeId));

  const threshold = Number(settings?.lowStockThreshold ?? 5);

  const rows = await db
    .select({
      productName: product.name,
      articleCode: product.articleCode,
      size: productVariant.size,
      color: productVariant.color,
      quantity: inventory.quantity,
    })
    .from(inventory)
    .innerJoin(productVariant, eq(inventory.variantId, productVariant.id))
    .innerJoin(product, eq(productVariant.productId, product.id))
    .where(and(eq(inventory.storeId, storeId), lt(inventory.quantity, threshold)))
    .orderBy(inventory.quantity)
    .limit(20);

  if (rows.length === 0) {
    return { answer: `Nothing is below your low-stock threshold of ${threshold} units. You're well stocked!` };
  }

  return {
    answer: `${rows.length} variant(s) are below your low-stock threshold of ${threshold} units and should be restocked soon.`,
    data: rows,
  };
}

export async function handleBridalStatus(query: ParsedQuery, storeId: string): Promise<HandlerResult> {
  if (!query.phone && !query.searchTerm) {
    return { answer: "Give me a bride's name or mobile number to check the order status." };
  }

  const [order] = await db
    .select()
    .from(bridalOrder)
    .where(
      and(
        eq(bridalOrder.storeId, storeId),
        query.phone
          ? eq(bridalOrder.brideMobile, query.phone)
          : ilike(bridalOrder.brideName, `%${query.searchTerm}%`)
      )
    )
    .orderBy(desc(bridalOrder.createdAt))
    .limit(1);

  if (!order) {
    return { answer: "I couldn't find a bridal order matching that." };
  }

  return {
    answer: `${order.brideName}'s bridal order is currently at status "${order.status}", wedding date ${order.weddingDate}. Pending amount: ₹${(
      Number(order.totalAmount) - Number(order.advancePaid)
    ).toLocaleString("en-IN")}.`,
    data: [
      {
        brideName: order.brideName,
        status: order.status,
        weddingDate: order.weddingDate,
        totalAmount: order.totalAmount,
        advancePaid: order.advancePaid,
      },
    ],
  };
}
