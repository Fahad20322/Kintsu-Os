/**
 * Website Sync — Order Webhook
 *
 * POST /api/integrations/webhooks/order
 *
 * Auth: header `x-api-key: <WEBSITE_SYNC_API_KEY>`
 *
 * Request body:
 * {
 *   "items": [{ "variantId": string, "quantity": number }],
 *   "customerName"?: string,
 *   "customerMobile"?: string,
 *   "customerEmail"?: string
 * }
 *
 * Response 200:
 * { "ok": true, "stock": [{ "variantId": string, "quantity": number }] }
 *
 * Reconciles inventory for an order placed on the e-commerce website against
 * the single shared inventory source. This intentionally does NOT create a
 * `sale`/`saleItem` row — those are scoped to a specific store/cashier in
 * this schema and a website order isn't a POS transaction.
 * TODO: model website orders as their own entity distinct from in-store
 * `sale` once a dedicated online-orders table exists — for now this only
 * reconciles inventory and (optionally) upserts the customer record for
 * cross-channel attribution.
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customer, inventory, productVariant, stockMovement } from "@/db/schema";
import { verifyApiKey } from "@/lib/api-auth";

const orderSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      })
    )
    .min(1),
  customerName: z.string().optional(),
  customerMobile: z.string().optional(),
  customerEmail: z.string().optional(),
});

export async function POST(request: Request) {
  const authError = verifyApiKey(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  try {
    const stock = await db.transaction(async (tx) => {
      const results: { variantId: string; quantity: number }[] = [];

      for (const item of input.items) {
        const [variant] = await tx
          .select({ id: productVariant.id, sku: productVariant.sku })
          .from(productVariant)
          .where(eq(productVariant.id, item.variantId));
        if (!variant) throw new Error(`Unknown variant: ${item.variantId}`);

        // Website orders draw from every warehouse's pooled stock for the
        // variant's store(s); for simplicity in this v1, decrement from
        // whichever warehouse row currently holds sellable stock first.
        const invRows = await tx
          .select()
          .from(inventory)
          .where(eq(inventory.variantId, item.variantId));

        let remaining = item.quantity;
        for (const row of invRows) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, row.quantity);
          if (take <= 0) continue;

          const newQty = row.quantity - take;
          await tx.update(inventory).set({ quantity: newQty }).where(eq(inventory.id, row.id));

          await tx.insert(stockMovement).values({
            variantId: item.variantId,
            storeId: row.storeId,
            warehouseId: row.warehouseId,
            type: "SALE_OUT",
            quantity: take,
            balanceAfter: newQty,
            reason: "Website order",
            refType: "WEBSITE_ORDER",
          });

          remaining -= take;
        }

        if (remaining > 0) {
          throw new Error(`Insufficient stock for SKU ${variant.sku}`);
        }

        const totalRemaining = await tx
          .select()
          .from(inventory)
          .where(eq(inventory.variantId, item.variantId));
        results.push({
          variantId: item.variantId,
          quantity: totalRemaining.reduce((sum, r) => sum + r.quantity, 0),
        });
      }

      if (input.customerMobile) {
        const [existing] = await tx
          .select()
          .from(customer)
          .where(eq(customer.mobile, input.customerMobile));
        if (!existing) {
          await tx.insert(customer).values({
            name: input.customerName || "Website customer",
            mobile: input.customerMobile,
            email: input.customerEmail,
          });
        }
      }

      return results;
    });

    return Response.json({ ok: true, stock });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Order processing failed" },
      { status: 400 }
    );
  }
}
