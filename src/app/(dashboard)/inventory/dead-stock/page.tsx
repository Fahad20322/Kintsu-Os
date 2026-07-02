import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { deadStockReport } from "@/actions/inventory";
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

const DAYS_THRESHOLD = 60;

export default async function DeadStockPage() {
  const rows = await deadStockReport(DAYS_THRESHOLD);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dead stock report</h1>
          <p className="text-sm text-muted-foreground">
            Variants in stock with no sale in the last {DAYS_THRESHOLD} days
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
                  <TableHead>Article code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantity on hand</TableHead>
                  <TableHead>Last sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.variantId}>
                    <TableCell className="font-mono text-xs">{r.articleCode}</TableCell>
                    <TableCell className="font-medium">{r.productName}</TableCell>
                    <TableCell>{r.size}</TableCell>
                    <TableCell>{r.color}</TableCell>
                    <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                    <TableCell>
                      <Badge variant="warning">{r.quantity} units</Badge>
                    </TableCell>
                    <TableCell>
                      {r.daysSinceLastSale === null
                        ? "Never sold"
                        : `${r.daysSinceLastSale} days ago`}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No dead stock — everything in stock has sold recently.
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
