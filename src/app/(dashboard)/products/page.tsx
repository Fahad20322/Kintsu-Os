import Link from "next/link";
import { sql } from "drizzle-orm";
import { Plus, Search } from "lucide-react";
import { db } from "@/db";
import { category, productVariant } from "@/db/schema";
import { listProducts } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { rows, total } = await listProducts({ search: q, pageSize: 50 });

  const categories = await db.select().from(category);
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const variantCounts = await db
    .select({
      productId: productVariant.productId,
      count: sql<number>`count(*)::int`,
    })
    .from(productVariant)
    .groupBy(productVariant.productId);
  const variantCountMap = new Map(variantCounts.map((v) => [v.productId, v.count]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">{total} products in catalog</p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus /> Add product
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="mb-4 flex max-w-sm items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search by name or article code"
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead>Selling price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer">
                    <TableCell className="font-mono text-xs">
                      <Link href={`/products/${p.id}`} className="hover:underline">
                        {p.articleCode}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {p.categoryId ? categoryMap.get(p.categoryId) ?? "—" : "—"}
                    </TableCell>
                    <TableCell>{p.gender}</TableCell>
                    <TableCell>{variantCountMap.get(p.id) ?? 0}</TableCell>
                    <TableCell>₹{Number(p.mrp).toLocaleString("en-IN")}</TableCell>
                    <TableCell>₹{Number(p.sellingPrice).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? "success" : "secondary"}>
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No products yet. Add your first product to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
