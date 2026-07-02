import Link from "next/link";
import { Plus } from "lucide-react";
import { listPurchaseOrders } from "@/actions/purchases";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DRAFT: "secondary",
  SENT: "default",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "destructive",
};

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const orders = await listPurchaseOrders({ status });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} purchase orders</p>
        </div>
        <Button asChild>
          <Link href="/purchases/new">
            <Plus /> Create PO
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected date</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((po) => (
                  <TableRow key={po.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/purchases/${po.id}`} className="font-medium hover:underline">
                        {po.poNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/vendors/${po.vendorId}`} className="hover:underline">
                        {po.vendorName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[po.status] ?? "default"}>
                        {po.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{po.expectedDate ?? "—"}</TableCell>
                    <TableCell>₹{Number(po.totalAmount).toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No purchase orders yet. Create your first PO to get started.
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
