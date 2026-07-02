import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listStockMovements } from "@/actions/inventory";
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

const MOVEMENT_LIMIT = 100;

const IN_MOVEMENT_TYPES = new Set([
  "PURCHASE_IN",
  "RETURN_IN",
  "EXCHANGE_IN",
  "TRANSFER_IN",
  "ADJUSTMENT_IN",
]);

export default async function StockMovementsPage() {
  const movements = await listStockMovements(MOVEMENT_LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock movements</h1>
          <p className="text-sm text-muted-foreground">
            Most recent {MOVEMENT_LIMIT} ledger entries, newest first
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/inventory">
            <ArrowLeft /> Back to inventory
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Balance after</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {m.createdAt.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{m.productName}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {m.articleCode} · {m.size}/{m.color} · {m.sku}
                      </div>
                    </TableCell>
                    <TableCell>{m.warehouseName}</TableCell>
                    <TableCell>
                      <Badge variant={IN_MOVEMENT_TYPES.has(m.type) ? "success" : "secondary"}>
                        {m.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.quantity}</TableCell>
                    <TableCell>{m.balanceAfter}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.reason || "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No stock movements recorded yet.
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
