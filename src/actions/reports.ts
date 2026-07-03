"use server";

import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  customer,
  inventory,
  product,
  productVariant,
  purchaseOrder,
  sale,
  saleItem,
  user,
  vendor,
  vendorPayment,
  warehouse,
} from "@/db/schema";
import { requirePermission } from "@/lib/session";
import type { ReportType, ReportResult } from "@/lib/reports";

function dateRange(from?: string, to?: string) {
  const start = from ? new Date(`${from}T00:00:00`) : new Date(new Date().setDate(new Date().getDate() - 30));
  const end = to ? new Date(`${to}T23:59:59`) : new Date();
  return { start, end };
}

export async function runReport(
  type: ReportType,
  params: { from?: string; to?: string }
): Promise<ReportResult> {
  const currentUser = await requirePermission("reports:view");
  const storeId = currentUser.storeId;
  if (!storeId) throw new Error("No store associated with this account");

  const { start, end } = dateRange(params.from, params.to);

  switch (type) {
    case "SALES": {
      const rows = await db
        .select({
          invoiceNumber: sale.invoiceNumber,
          date: sale.createdAt,
          subtotal: sale.subtotal,
          discountAmount: sale.discountAmount,
          gstAmount: sale.gstAmount,
          totalAmount: sale.totalAmount,
          status: sale.status,
        })
        .from(sale)
        .where(and(eq(sale.storeId, storeId), gte(sale.createdAt, start), lte(sale.createdAt, end)))
        .orderBy(desc(sale.createdAt));

      const total = rows.reduce((s, r) => s + Number(r.totalAmount), 0);
      return {
        columns: [
          { key: "invoiceNumber", label: "Invoice" },
          { key: "date", label: "Date" },
          { key: "subtotal", label: "Subtotal" },
          { key: "discountAmount", label: "Discount" },
          { key: "gstAmount", label: "GST" },
          { key: "totalAmount", label: "Total" },
          { key: "status", label: "Status" },
        ],
        rows,
        summary: [
          { label: "Total sales", value: `₹${total.toLocaleString("en-IN")}` },
          { label: "Orders", value: String(rows.length) },
        ],
      };
    }

    case "GST": {
      const rows = await db
        .select({
          invoiceNumber: sale.invoiceNumber,
          date: sale.createdAt,
          subtotal: sale.subtotal,
          gstAmount: sale.gstAmount,
          totalAmount: sale.totalAmount,
        })
        .from(sale)
        .where(
          and(
            eq(sale.storeId, storeId),
            gte(sale.createdAt, start),
            lte(sale.createdAt, end),
            ne(sale.status, "VOID")
          )
        )
        .orderBy(desc(sale.createdAt));

      const totalGst = rows.reduce((s, r) => s + Number(r.gstAmount), 0);
      return {
        columns: [
          { key: "invoiceNumber", label: "Invoice" },
          { key: "date", label: "Date" },
          { key: "subtotal", label: "Taxable value" },
          { key: "gstAmount", label: "GST collected" },
          { key: "totalAmount", label: "Total" },
        ],
        rows,
        summary: [{ label: "Total GST collected", value: `₹${totalGst.toLocaleString("en-IN")}` }],
      };
    }

    case "INVENTORY": {
      const rows = await db
        .select({
          articleCode: product.articleCode,
          productName: product.name,
          size: productVariant.size,
          color: productVariant.color,
          sku: productVariant.sku,
          warehouse: warehouse.name,
          quantity: inventory.quantity,
        })
        .from(inventory)
        .innerJoin(productVariant, eq(inventory.variantId, productVariant.id))
        .innerJoin(product, eq(productVariant.productId, product.id))
        .innerJoin(warehouse, eq(inventory.warehouseId, warehouse.id))
        .where(eq(inventory.storeId, storeId))
        .orderBy(product.name);

      const totalUnits = rows.reduce((s, r) => s + r.quantity, 0);
      return {
        columns: [
          { key: "articleCode", label: "Article code" },
          { key: "productName", label: "Product" },
          { key: "size", label: "Size" },
          { key: "color", label: "Color" },
          { key: "sku", label: "SKU" },
          { key: "warehouse", label: "Warehouse" },
          { key: "quantity", label: "Quantity" },
        ],
        rows,
        summary: [{ label: "Total units in stock", value: totalUnits.toLocaleString("en-IN") }],
      };
    }

    case "PROFIT": {
      const rows = await db
        .select({
          date: sql<string>`to_char(${sale.createdAt}, 'YYYY-MM-DD')`,
          revenue: sql<string>`sum(${saleItem.lineTotal})`,
          cost: sql<string>`sum(${saleItem.quantity} * ${product.purchaseCost})`,
        })
        .from(saleItem)
        .innerJoin(sale, eq(saleItem.saleId, sale.id))
        .innerJoin(productVariant, eq(saleItem.variantId, productVariant.id))
        .innerJoin(product, eq(productVariant.productId, product.id))
        .where(
          and(
            eq(sale.storeId, storeId),
            gte(sale.createdAt, start),
            lte(sale.createdAt, end),
            ne(sale.status, "VOID")
          )
        )
        .groupBy(sql`to_char(${sale.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${sale.createdAt}, 'YYYY-MM-DD')`);

      const withProfit = rows.map((r) => ({
        date: r.date,
        revenue: Number(r.revenue).toFixed(2),
        cost: Number(r.cost).toFixed(2),
        profit: (Number(r.revenue) - Number(r.cost)).toFixed(2),
      }));
      const totalRevenue = withProfit.reduce((s, r) => s + Number(r.revenue), 0);
      const totalCost = withProfit.reduce((s, r) => s + Number(r.cost), 0);

      return {
        columns: [
          { key: "date", label: "Date" },
          { key: "revenue", label: "Revenue" },
          { key: "cost", label: "Cost" },
          { key: "profit", label: "Profit" },
        ],
        rows: withProfit,
        summary: [
          { label: "Total revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}` },
          { label: "Total profit", value: `₹${(totalRevenue - totalCost).toLocaleString("en-IN")}` },
        ],
      };
    }

    case "PURCHASE": {
      const rows = await db
        .select({
          poNumber: purchaseOrder.poNumber,
          vendorName: vendor.name,
          status: purchaseOrder.status,
          totalAmount: purchaseOrder.totalAmount,
          createdAt: purchaseOrder.createdAt,
        })
        .from(purchaseOrder)
        .innerJoin(vendor, eq(purchaseOrder.vendorId, vendor.id))
        .where(
          and(
            eq(purchaseOrder.storeId, storeId),
            gte(purchaseOrder.createdAt, start),
            lte(purchaseOrder.createdAt, end)
          )
        )
        .orderBy(desc(purchaseOrder.createdAt));

      const total = rows.reduce((s, r) => s + Number(r.totalAmount), 0);
      return {
        columns: [
          { key: "poNumber", label: "PO number" },
          { key: "vendorName", label: "Vendor" },
          { key: "status", label: "Status" },
          { key: "totalAmount", label: "Total" },
          { key: "createdAt", label: "Date" },
        ],
        rows,
        summary: [{ label: "Total purchase value", value: `₹${total.toLocaleString("en-IN")}` }],
      };
    }

    case "VENDOR": {
      const vendors = await db.select().from(vendor);
      const poTotals = await db
        .select({ vendorId: purchaseOrder.vendorId, total: sql<string>`coalesce(sum(${purchaseOrder.totalAmount}), 0)` })
        .from(purchaseOrder)
        .where(ne(purchaseOrder.status, "CANCELLED"))
        .groupBy(purchaseOrder.vendorId);
      const payments = await db
        .select({ vendorId: vendorPayment.vendorId, total: sql<string>`coalesce(sum(${vendorPayment.amount}), 0)` })
        .from(vendorPayment)
        .groupBy(vendorPayment.vendorId);

      const poMap = new Map(poTotals.map((p) => [p.vendorId, Number(p.total)]));
      const payMap = new Map(payments.map((p) => [p.vendorId, Number(p.total)]));

      const rows = vendors.map((v) => {
        const pending =
          Number(v.openingBalance) + (poMap.get(v.id) ?? 0) - (payMap.get(v.id) ?? 0);
        return {
          name: v.name,
          mobile: v.mobile,
          gstin: v.gstin,
          totalPurchases: (poMap.get(v.id) ?? 0).toFixed(2),
          totalPaid: (payMap.get(v.id) ?? 0).toFixed(2),
          pendingBalance: pending.toFixed(2),
        };
      });

      return {
        columns: [
          { key: "name", label: "Vendor" },
          { key: "mobile", label: "Mobile" },
          { key: "gstin", label: "GSTIN" },
          { key: "totalPurchases", label: "Total purchases" },
          { key: "totalPaid", label: "Total paid" },
          { key: "pendingBalance", label: "Pending balance" },
        ],
        rows,
      };
    }

    case "CUSTOMER": {
      const rows = await db
        .select({
          name: customer.name,
          mobile: customer.mobile,
          totalOrders: customer.totalOrders,
          totalSpend: customer.totalSpend,
          loyaltyPoints: customer.loyaltyPoints,
        })
        .from(customer)
        .orderBy(desc(customer.totalSpend));

      return {
        columns: [
          { key: "name", label: "Customer" },
          { key: "mobile", label: "Mobile" },
          { key: "totalOrders", label: "Orders" },
          { key: "totalSpend", label: "Total spend" },
          { key: "loyaltyPoints", label: "Loyalty points" },
        ],
        rows,
      };
    }

    case "BEST_SELLER": {
      const rows = await db
        .select({
          articleCode: product.articleCode,
          productName: product.name,
          totalQuantity: sql<number>`sum(${saleItem.quantity})::int`,
          totalRevenue: sql<string>`sum(${saleItem.lineTotal})`,
        })
        .from(saleItem)
        .innerJoin(sale, eq(saleItem.saleId, sale.id))
        .innerJoin(productVariant, eq(saleItem.variantId, productVariant.id))
        .innerJoin(product, eq(productVariant.productId, product.id))
        .where(
          and(
            eq(sale.storeId, storeId),
            gte(sale.createdAt, start),
            lte(sale.createdAt, end),
            ne(sale.status, "VOID")
          )
        )
        .groupBy(product.id, product.articleCode, product.name)
        .orderBy(desc(sql`sum(${saleItem.quantity})`))
        .limit(50);

      return {
        columns: [
          { key: "articleCode", label: "Article code" },
          { key: "productName", label: "Product" },
          { key: "totalQuantity", label: "Units sold" },
          { key: "totalRevenue", label: "Revenue" },
        ],
        rows,
      };
    }

    case "DEAD_STOCK": {
      const rows = await db.execute(sql`
        with stock_totals as (
          select ${inventory.variantId} as variant_id, sum(${inventory.quantity}) as quantity
          from ${inventory}
          where ${inventory.storeId} = ${storeId}
          group by ${inventory.variantId}
          having sum(${inventory.quantity}) > 0
        ),
        last_sale as (
          select ${saleItem.variantId} as variant_id, max(${sale.createdAt}) as last_sale_at
          from ${saleItem}
          inner join ${sale} on ${sale.id} = ${saleItem.saleId}
          where ${sale.storeId} = ${storeId}
          group by ${saleItem.variantId}
        )
        select
          ${product.articleCode} as "articleCode",
          ${product.name} as "productName",
          ${productVariant.sku} as "sku",
          st.quantity as "quantity",
          ls.last_sale_at as "lastSaleAt"
        from stock_totals st
        inner join ${productVariant} on ${productVariant.id} = st.variant_id
        inner join ${product} on ${product.id} = ${productVariant.productId}
        left join last_sale ls on ls.variant_id = st.variant_id
        where ls.last_sale_at is null or ls.last_sale_at < now() - interval '60 days'
        order by st.quantity desc
      `);

      return {
        columns: [
          { key: "articleCode", label: "Article code" },
          { key: "productName", label: "Product" },
          { key: "sku", label: "SKU" },
          { key: "quantity", label: "Quantity" },
          { key: "lastSaleAt", label: "Last sold" },
        ],
        rows: rows.rows as Record<string, unknown>[],
      };
    }

    case "STAFF_SALES": {
      const rows = await db
        .select({
          staffName: user.name,
          orders: sql<number>`count(*)::int`,
          totalSales: sql<string>`sum(${sale.totalAmount})`,
        })
        .from(sale)
        .innerJoin(user, eq(sale.cashierId, user.id))
        .where(
          and(
            eq(sale.storeId, storeId),
            gte(sale.createdAt, start),
            lte(sale.createdAt, end),
            ne(sale.status, "VOID")
          )
        )
        .groupBy(user.id, user.name)
        .orderBy(desc(sql`sum(${sale.totalAmount})`));

      return {
        columns: [
          { key: "staffName", label: "Staff" },
          { key: "orders", label: "Orders" },
          { key: "totalSales", label: "Total sales" },
        ],
        rows,
      };
    }

    default:
      return { columns: [], rows: [] };
  }
}
