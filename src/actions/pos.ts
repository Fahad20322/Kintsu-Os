"use server";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  couponCode as couponCodeTable,
  customer,
  giftCard,
  inventory,
  loyaltyTransaction,
  payment,
  product,
  productVariant,
  sale,
  saleItem,
  store as storeTable,
  storeSettings,
  stockMovement,
  warehouse,
} from "@/db/schema";
import { requirePermission } from "@/lib/session";
import { hasPermission, type Role } from "@/lib/rbac";
import { nextInvoiceNumber } from "@/lib/numbering";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/pos";

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function getDefaultWarehouseId(storeId: string) {
  const [wh] = await db
    .select({ id: warehouse.id })
    .from(warehouse)
    .where(and(eq(warehouse.storeId, storeId), eq(warehouse.isDefault, 1)))
    .limit(1);
  return wh?.id;
}

export async function findVariantByCode(code: string) {
  await requirePermission("pos:use");
  const trimmed = code.trim();
  if (!trimmed) return null;

  const [row] = await db
    .select({
      variantId: productVariant.id,
      sku: productVariant.sku,
      barcode: productVariant.barcode,
      size: productVariant.size,
      color: productVariant.color,
      productName: product.name,
      articleCode: product.articleCode,
      sellingPrice: product.sellingPrice,
      sellingPriceOverride: productVariant.sellingPriceOverride,
      gstRate: product.gstRate,
    })
    .from(productVariant)
    .innerJoin(product, eq(productVariant.productId, product.id))
    .where(
      or(eq(productVariant.barcode, trimmed), eq(productVariant.sku, trimmed))
    )
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    unitPrice: Number(row.sellingPriceOverride ?? row.sellingPrice),
    gstRate: Number(row.gstRate),
  };
}

export async function searchCustomers(query: string) {
  await requirePermission("pos:use");
  if (!query.trim()) return [];
  return db
    .select()
    .from(customer)
    .where(
      or(ilike(customer.name, `%${query}%`), ilike(customer.mobile, `%${query}%`))
    )
    .limit(10);
}

export async function validateCoupon(code: string, cartSubtotal: number) {
  await requirePermission("pos:use");
  const [coupon] = await db
    .select()
    .from(couponCodeTable)
    .where(eq(couponCodeTable.code, code.trim().toUpperCase()));

  if (!coupon || !coupon.isActive) throw new Error("Invalid coupon code");
  if (coupon.validUntil && coupon.validUntil < new Date())
    throw new Error("Coupon has expired");
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses)
    throw new Error("Coupon usage limit reached");
  if (Number(coupon.minCartValue) > cartSubtotal)
    throw new Error(`Coupon requires a minimum cart value of ₹${coupon.minCartValue}`);

  const discount = coupon.discountPercent
    ? round2((cartSubtotal * Number(coupon.discountPercent)) / 100)
    : round2(Number(coupon.discountFlat ?? 0));

  return { coupon, discount: Math.min(discount, cartSubtotal) };
}

export async function checkout(rawInput: unknown) {
  const user = await requirePermission("pos:use");
  const input: CheckoutInput = checkoutSchema.parse(rawInput);

  if (!user.storeId) throw new Error("No store associated with this account");
  const warehouseId = await getDefaultWarehouseId(user.storeId);
  if (!warehouseId) throw new Error("No default warehouse configured for this store");

  const [settings] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.storeId, user.storeId));

  const role = user.role as Role;
  const canOverrideDiscount = hasPermission(role, "pos:discount_override");
  const maxDiscountPercent = Number(settings?.maxDiscountPercent ?? 20);
  const loyaltyPointsPerRupee = Number(settings?.loyaltyPointsPerRupee ?? 0.1);
  const loyaltyRedemptionValue = Number(settings?.loyaltyRedemptionValue ?? 0.5);

  // Re-fetch authoritative pricing server-side to prevent client price tampering.
  const variantIds = input.items.map((i) => i.variantId);
  const variantRows = await db
    .select({
      id: productVariant.id,
      sku: productVariant.sku,
      sellingPrice: product.sellingPrice,
      sellingPriceOverride: productVariant.sellingPriceOverride,
      gstRate: product.gstRate,
    })
    .from(productVariant)
    .innerJoin(product, eq(productVariant.productId, product.id))
    .where(or(...variantIds.map((id) => eq(productVariant.id, id))));

  const variantMap = new Map(variantRows.map((v) => [v.id, v]));

  let subtotal = 0;
  let itemDiscountTotal = 0;
  let gstAmount = 0;

  const lineItems = input.items.map((item) => {
    const authoritative = variantMap.get(item.variantId);
    if (!authoritative) throw new Error("One or more products could not be found");

    const unitPrice = Number(authoritative.sellingPriceOverride ?? authoritative.sellingPrice);
    const gstRate = Number(authoritative.gstRate);
    const lineSubtotal = unitPrice * item.quantity;
    const lineDiscount = Math.min(Math.max(item.discountAmount, 0), lineSubtotal);
    const lineTaxable = lineSubtotal - lineDiscount;
    const lineGst = round2((lineTaxable * gstRate) / 100);
    const lineTotal = round2(lineTaxable + lineGst);

    subtotal = round2(subtotal + lineSubtotal);
    itemDiscountTotal = round2(itemDiscountTotal + lineDiscount);
    gstAmount = round2(gstAmount + lineGst);

    return {
      variantId: item.variantId,
      sku: authoritative.sku,
      quantity: item.quantity,
      unitPrice,
      gstRate,
      lineDiscount,
      lineGst,
      lineTotal,
    };
  });

  let couponDiscount = 0;
  let matchedCoupon: typeof couponCodeTable.$inferSelect | null = null;
  if (input.couponCode) {
    const result = await validateCoupon(input.couponCode, subtotal);
    couponDiscount = result.discount;
    matchedCoupon = result.coupon;
  }

  const manualDiscount = input.discountAmount;
  const cashierControlledDiscount = round2(itemDiscountTotal + manualDiscount);

  if (!canOverrideDiscount) {
    const cap = round2((subtotal * maxDiscountPercent) / 100);
    if (cashierControlledDiscount > cap) {
      throw new Error(
        `Discount exceeds the maximum allowed (${maxDiscountPercent}%). Ask a manager to override.`
      );
    }
  }

  const totalDiscount = round2(cashierControlledDiscount + couponDiscount);

  let loyaltyRedemptionAmount = 0;
  if (input.loyaltyPointsRedeemed > 0) {
    if (!input.customerId) throw new Error("Select a customer to redeem loyalty points");
    const [cust] = await db.select().from(customer).where(eq(customer.id, input.customerId));
    if (!cust || cust.loyaltyPoints < input.loyaltyPointsRedeemed) {
      throw new Error("Customer does not have enough loyalty points");
    }
    loyaltyRedemptionAmount = round2(input.loyaltyPointsRedeemed * loyaltyRedemptionValue);
  }

  const totalAmount = Math.max(
    0,
    round2(subtotal - totalDiscount - loyaltyRedemptionAmount + gstAmount)
  );

  const paymentsTotal = round2(input.payments.reduce((sum, p) => sum + p.amount, 0));
  if (Math.abs(paymentsTotal - totalAmount) > 1) {
    throw new Error(
      `Payment total (₹${paymentsTotal}) does not match amount due (₹${totalAmount})`
    );
  }

  const loyaltyPointsEarned = input.customerId
    ? Math.floor(totalAmount * loyaltyPointsPerRupee)
    : 0;

  const invoiceNumber = await nextInvoiceNumber(user.storeId);

  const createdSale = await db.transaction(async (tx) => {
    const [newSale] = await tx
      .insert(sale)
      .values({
        invoiceNumber,
        storeId: user.storeId!,
        customerId: input.customerId || null,
        cashierId: user.id,
        subtotal: String(subtotal),
        discountAmount: String(totalDiscount + loyaltyRedemptionAmount),
        couponCodeId: matchedCoupon?.id ?? null,
        gstAmount: String(gstAmount),
        totalAmount: String(totalAmount),
        loyaltyPointsEarned,
        loyaltyPointsRedeemed: input.loyaltyPointsRedeemed,
        status: "COMPLETED",
        notes: input.notes,
      })
      .returning();

    for (const line of lineItems) {
      await tx.insert(saleItem).values({
        saleId: newSale.id,
        variantId: line.variantId,
        quantity: line.quantity,
        unitPrice: String(line.unitPrice),
        discountAmount: String(line.lineDiscount),
        gstRate: String(line.gstRate),
        gstAmount: String(line.lineGst),
        lineTotal: String(line.lineTotal),
      });

      const [existingInventory] = await tx
        .select()
        .from(inventory)
        .where(
          and(eq(inventory.variantId, line.variantId), eq(inventory.warehouseId, warehouseId))
        );

      const currentQty = existingInventory?.quantity ?? 0;
      if (currentQty < line.quantity) {
        throw new Error(`Insufficient stock for SKU ${line.sku}`);
      }
      const newQty = currentQty - line.quantity;

      await tx
        .update(inventory)
        .set({ quantity: newQty })
        .where(eq(inventory.id, existingInventory!.id));

      await tx.insert(stockMovement).values({
        variantId: line.variantId,
        storeId: user.storeId!,
        warehouseId,
        type: "SALE_OUT",
        quantity: line.quantity,
        balanceAfter: newQty,
        reason: `Sale ${invoiceNumber}`,
        refType: "SALE",
        refId: newSale.id,
        performedById: user.id,
      });
    }

    for (const p of input.payments) {
      let giftCardId: string | null = null;
      if (p.method === "GIFT_CARD") {
        if (!p.giftCardCode) throw new Error("Gift card code is required");
        const [gc] = await tx
          .select()
          .from(giftCard)
          .where(eq(giftCard.code, p.giftCardCode.trim().toUpperCase()));
        if (!gc || !gc.isActive) throw new Error("Invalid gift card");
        if (Number(gc.balance) < p.amount) throw new Error("Gift card has insufficient balance");
        await tx
          .update(giftCard)
          .set({ balance: String(round2(Number(gc.balance) - p.amount)) })
          .where(eq(giftCard.id, gc.id));
        giftCardId = gc.id;
      }

      await tx.insert(payment).values({
        saleId: newSale.id,
        method: p.method,
        amount: String(p.amount),
        referenceNumber: p.referenceNumber,
        giftCardId,
      });
    }

    if (matchedCoupon) {
      await tx
        .update(couponCodeTable)
        .set({ usedCount: sql`${couponCodeTable.usedCount} + 1` })
        .where(eq(couponCodeTable.id, matchedCoupon.id));
    }

    if (input.customerId) {
      await tx
        .update(customer)
        .set({
          totalSpend: sql`${customer.totalSpend} + ${totalAmount}`,
          totalOrders: sql`${customer.totalOrders} + 1`,
          loyaltyPoints: sql`${customer.loyaltyPoints} + ${loyaltyPointsEarned} - ${input.loyaltyPointsRedeemed}`,
        })
        .where(eq(customer.id, input.customerId));

      if (loyaltyPointsEarned > 0) {
        await tx.insert(loyaltyTransaction).values({
          customerId: input.customerId,
          points: loyaltyPointsEarned,
          type: "EARN",
          refType: "SALE",
          refId: newSale.id,
        });
      }
      if (input.loyaltyPointsRedeemed > 0) {
        await tx.insert(loyaltyTransaction).values({
          customerId: input.customerId,
          points: -input.loyaltyPointsRedeemed,
          type: "REDEEM",
          refType: "SALE",
          refId: newSale.id,
        });
      }
    }

    return newSale;
  });

  revalidatePath("/pos");
  revalidatePath("/pos/history");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");

  return createdSale;
}

export async function getSale(id: string) {
  await requirePermission("pos:use");

  const [saleRow] = await db.select().from(sale).where(eq(sale.id, id));
  if (!saleRow) return null;

  const items = await db
    .select({
      id: saleItem.id,
      variantId: saleItem.variantId,
      quantity: saleItem.quantity,
      unitPrice: saleItem.unitPrice,
      discountAmount: saleItem.discountAmount,
      gstRate: saleItem.gstRate,
      gstAmount: saleItem.gstAmount,
      lineTotal: saleItem.lineTotal,
      returnedQuantity: saleItem.returnedQuantity,
      sku: productVariant.sku,
      size: productVariant.size,
      color: productVariant.color,
      productName: product.name,
    })
    .from(saleItem)
    .innerJoin(productVariant, eq(saleItem.variantId, productVariant.id))
    .innerJoin(product, eq(productVariant.productId, product.id))
    .where(eq(saleItem.saleId, id));

  const payments = await db.select().from(payment).where(eq(payment.saleId, id));

  let customerRow = null;
  if (saleRow.customerId) {
    [customerRow] = await db.select().from(customer).where(eq(customer.id, saleRow.customerId));
  }

  const [storeRow] = await db.select().from(storeTable).where(eq(storeTable.id, saleRow.storeId));
  const [settings] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.storeId, saleRow.storeId));

  return { sale: saleRow, items, payments, customer: customerRow, store: storeRow, settings };
}

export async function listRecentSales(limit = 20) {
  await requirePermission("pos:use");
  return db
    .select({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      totalAmount: sale.totalAmount,
      status: sale.status,
      createdAt: sale.createdAt,
      customerName: customer.name,
    })
    .from(sale)
    .leftJoin(customer, eq(sale.customerId, customer.id))
    .orderBy(desc(sale.createdAt))
    .limit(limit);
}

export async function searchSales(query: string) {
  await requirePermission("pos:use");
  if (!query.trim()) return listRecentSales(20);
  return db
    .select({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      totalAmount: sale.totalAmount,
      status: sale.status,
      createdAt: sale.createdAt,
      customerName: customer.name,
    })
    .from(sale)
    .leftJoin(customer, eq(sale.customerId, customer.id))
    .where(
      or(
        ilike(sale.invoiceNumber, `%${query}%`),
        ilike(customer.name, `%${query}%`),
        ilike(customer.mobile, `%${query}%`)
      )
    )
    .orderBy(desc(sale.createdAt))
    .limit(50);
}
