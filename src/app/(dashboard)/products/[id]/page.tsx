import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { Printer } from "lucide-react";
import { db } from "@/db";
import { brand, category, collection, inventory, subcategory } from "@/db/schema";
import { getProduct } from "@/actions/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddVariantDialog } from "@/components/products/add-variant-dialog";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productData = await getProduct(id);
  if (!productData) notFound();

  const [stockRows, [cat], [subcat], [br], [coll]] = await Promise.all([
    db
      .select({ variantId: inventory.variantId, qty: sql<number>`sum(${inventory.quantity})::int` })
      .from(inventory)
      .groupBy(inventory.variantId),
    productData.categoryId
      ? db.select().from(category).where(eq(category.id, productData.categoryId))
      : Promise.resolve([]),
    productData.subcategoryId
      ? db.select().from(subcategory).where(eq(subcategory.id, productData.subcategoryId))
      : Promise.resolve([]),
    productData.brandId
      ? db.select().from(brand).where(eq(brand.id, productData.brandId))
      : Promise.resolve([]),
    productData.collectionId
      ? db.select().from(collection).where(eq(collection.id, productData.collectionId))
      : Promise.resolve([]),
  ]);

  const stockMap = new Map(stockRows.map((r) => [r.variantId, r.qty]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{productData.name}</h1>
            <Badge variant={productData.isActive ? "success" : "secondary"}>
              {productData.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="font-mono text-sm text-muted-foreground">{productData.articleCode}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/products/${id}/labels`}>
            <Printer /> Print barcode labels
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attributes</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Attr label="Category" value={cat?.name} />
            <Attr label="Subcategory" value={subcat?.name} />
            <Attr label="Brand" value={br?.name} />
            <Attr label="Collection" value={coll?.name} />
            <Attr label="Gender" value={productData.gender} />
            <Attr label="Season" value={productData.season} />
            <Attr label="Occasion" value={productData.occasion} />
            <Attr label="Fabric" value={productData.fabric} />
            <Attr label="Pattern" value={productData.pattern} />
            <Attr label="Sleeve type" value={productData.sleeveType} />
            <Attr label="Neck type" value={productData.neckType} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Attr label="MRP" value={`₹${Number(productData.mrp).toLocaleString("en-IN")}`} />
            <Attr
              label="Selling price"
              value={`₹${Number(productData.sellingPrice).toLocaleString("en-IN")}`}
            />
            <Attr
              label="Purchase cost"
              value={`₹${Number(productData.purchaseCost).toLocaleString("en-IN")}`}
            />
            <Attr label="GST rate" value={`${productData.gstRate}%`} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Variants & stock</CardTitle>
          <AddVariantDialog productId={id} />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Size</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productData.variants.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.size}</TableCell>
                    <TableCell>{v.color}</TableCell>
                    <TableCell className="font-mono text-xs">{v.sku}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/barcode/${encodeURIComponent(v.barcode)}`}
                          alt={v.barcode}
                          className="h-8"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(stockMap.get(v.id) ?? 0) > 5 ? "success" : "warning"}>
                        {stockMap.get(v.id) ?? 0} units
                      </Badge>
                    </TableCell>
                    <TableCell>{v.isActive ? "Active" : "Inactive"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Attr({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
