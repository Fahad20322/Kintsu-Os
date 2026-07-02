import Link from "next/link";
import { History, TrendingDown } from "lucide-react";
import { listInventory, listWarehouses } from "@/actions/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { StockInDialog } from "@/components/inventory/stock-in-dialog";
import { StockOutDialog } from "@/components/inventory/stock-out-dialog";
import { TransferStockDialog } from "@/components/inventory/transfer-stock-dialog";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; warehouseId?: string; lowStockOnly?: string }>;
}) {
  const { q, warehouseId, lowStockOnly } = await searchParams;

  const [warehouses, { rows, threshold }] = await Promise.all([
    listWarehouses(),
    listInventory({ search: q, warehouseId, lowStockOnly: lowStockOnly === "1" }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} stock record{rows.length === 1 ? "" : "s"} across{" "}
            {warehouses.length} warehouse{warehouses.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/inventory/movements">
              <History /> Movements
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/inventory/dead-stock">
              <TrendingDown /> Dead stock
            </Link>
          </Button>
          <StockOutDialog warehouses={warehouses} />
          <TransferStockDialog warehouses={warehouses} />
          <StockInDialog warehouses={warehouses} />
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <InventoryFilters
            warehouses={warehouses}
            search={q}
            warehouseId={warehouseId}
            lowStockOnly={lowStockOnly === "1"}
          />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reserved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.articleCode}</TableCell>
                    <TableCell className="font-medium">{r.productName}</TableCell>
                    <TableCell>{r.size}</TableCell>
                    <TableCell>{r.color}</TableCell>
                    <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                    <TableCell>{r.warehouseName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.quantity === 0
                            ? "destructive"
                            : r.quantity <= threshold
                              ? "warning"
                              : "success"
                        }
                      >
                        {r.quantity} units
                      </Badge>
                    </TableCell>
                    <TableCell>{r.reservedQuantity}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No inventory records match your filters.
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
