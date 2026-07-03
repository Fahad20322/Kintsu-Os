/**
 * Website Sync — Inventory Read API
 *
 * GET /api/integrations/inventory
 * GET /api/integrations/inventory?updatedSince=2026-07-01T00:00:00.000Z
 *
 * Auth: header `x-api-key: <WEBSITE_SYNC_API_KEY>`
 *
 * Response 200:
 * {
 *   "products": [
 *     {
 *       "id": string,
 *       "articleCode": string,
 *       "name": string,
 *       "sellingPrice": string,
 *       "updatedAt": string (ISO),
 *       "variants": [
 *         { "id": string, "sku": string, "size": string, "color": string,
 *           "barcode": string, "quantity": number }
 *       ]
 *     }
 *   ]
 * }
 *
 * This is the "read" side of the single-inventory-source contract described
 * in the spec's Website Sync module: a future e-commerce frontend polls (or
 * is pushed) this to keep its own catalog/stock in sync with the physical
 * store. `updatedSince` filters to products or variants touched after that
 * timestamp for cheap incremental syncing.
 */
import { and, eq, gte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { inventory, product, productVariant } from "@/db/schema";
import { verifyApiKey } from "@/lib/api-auth";

export async function GET(request: Request) {
  const authError = verifyApiKey(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const updatedSince = url.searchParams.get("updatedSince");
  const since = updatedSince ? new Date(updatedSince) : null;
  if (updatedSince && (!since || Number.isNaN(since.getTime()))) {
    return Response.json({ error: "Invalid updatedSince timestamp" }, { status: 400 });
  }

  const productConditions = [eq(product.isActive, true)];
  if (since) {
    productConditions.push(
      or(gte(product.updatedAt, since), gte(productVariant.createdAt, since))!
    );
  }

  const rows = await db
    .select({
      productId: product.id,
      articleCode: product.articleCode,
      name: product.name,
      sellingPrice: product.sellingPrice,
      productUpdatedAt: product.updatedAt,
      variantId: productVariant.id,
      sku: productVariant.sku,
      barcode: productVariant.barcode,
      size: productVariant.size,
      color: productVariant.color,
      quantity: sql<number>`coalesce(sum(${inventory.quantity}), 0)::int`,
    })
    .from(product)
    .innerJoin(productVariant, eq(productVariant.productId, product.id))
    .leftJoin(inventory, eq(inventory.variantId, productVariant.id))
    .where(and(...productConditions))
    .groupBy(
      product.id,
      product.articleCode,
      product.name,
      product.sellingPrice,
      product.updatedAt,
      productVariant.id,
      productVariant.sku,
      productVariant.barcode,
      productVariant.size,
      productVariant.color
    );

  const productMap = new Map<
    string,
    {
      id: string;
      articleCode: string;
      name: string;
      sellingPrice: string;
      updatedAt: string;
      variants: { id: string; sku: string; barcode: string; size: string; color: string; quantity: number }[];
    }
  >();

  for (const row of rows) {
    if (!productMap.has(row.productId)) {
      productMap.set(row.productId, {
        id: row.productId,
        articleCode: row.articleCode,
        name: row.name,
        sellingPrice: row.sellingPrice,
        updatedAt: row.productUpdatedAt.toISOString(),
        variants: [],
      });
    }
    productMap.get(row.productId)!.variants.push({
      id: row.variantId,
      sku: row.sku,
      barcode: row.barcode,
      size: row.size,
      color: row.color,
      quantity: row.quantity,
    });
  }

  return Response.json({ products: Array.from(productMap.values()) });
}
