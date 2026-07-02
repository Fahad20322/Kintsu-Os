import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { warehouse } from "@/db/schema";
import { getPurchaseOrder } from "@/actions/purchases";
import { requireUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReceiveGrnDialog, type ReceivableItem } from "@/components/purchases/receive-grn-dialog";
import { CancelPoButton } from "@/components/purchases/cancel-po-button";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DRAFT: "secondary",
  SENT: "default",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "destructive",
};

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPurchaseOrder(id);
  if (!data) notFound();

  const user = await requireUser();
  const warehouses = user.storeId
    ? await db.select().from(warehouse).where(eq(warehouse.storeId, user.storeId))
    : [];

  const { purchaseOrder: po, vendor, items, grns } = data;

  const hasReceivedAny = items.some((i) => i.quantityReceived > 0);
  const receivableItems: ReceivableItem[] = items
    .filter((i) => i.quantityReceived < i.quantityOrdered)
    .map((i) => ({
      purchaseOrderItemId: i.id,
      variantId: i.variantId,
      label: `${i.productName} — ${i.size}/${i.color} (${i.sku})`,
      remaining: i.quantityOrdered - i.quantityReceived,
    }));

  const canReceive = po.status === "SENT" || po.status === "PARTIALLY_RECEIVED";
  const canCancel = (po.status === "DRAFT" || po.status === "SENT") && !hasReceivedAny;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{po.poNumber}</h1>
            <Badge variant={STATUS_VARIANT[po.status] ?? "default"}>
              {po.status.replace("_", " ")}
            </Badge>
          </div>
          {vendor && (
            <p className="text-sm text-muted-foreground">
              Vendor:{" "}
              <Link href={`/vendors/${vendor.id}`} className="hover:underline">
                {vendor.name}
              </Link>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {canCancel && <CancelPoButton purchaseOrderId={po.id} />}
          {canReceive && (
            <ReceiveGrnDialog
              purchaseOrderId={po.id}
              items={receivableItems}
              warehouses={warehouses}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Attr label="Expected date" value={po.expectedDate} />
            <Attr label="Total amount" value={`₹${Number(po.totalAmount).toLocaleString("en-IN")}`} />
            <Attr label="Created" value={new Date(po.createdAt).toLocaleDateString("en-IN")} />
            <Attr label="Notes" value={po.notes} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Unit cost</TableHead>
                  <TableHead>Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.productName} — {item.size}/{item.color}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell>{item.quantityOrdered}</TableCell>
                    <TableCell>
                      <Badge variant={item.quantityReceived >= item.quantityOrdered ? "success" : "warning"}>
                        {item.quantityReceived} / {item.quantityOrdered}
                      </Badge>
                    </TableCell>
                    <TableCell>₹{Number(item.unitCost).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      ₹{(item.quantityOrdered * Number(item.unitCost)).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goods receipt notes (GRN)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {grns.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No stock has been received against this purchase order yet.
            </p>
          )}
          {grns.map((g) => (
            <div key={g.id} className="space-y-2 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{g.grnNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(g.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
              {g.notes && <p className="text-sm text-muted-foreground">{g.notes}</p>}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Damaged</TableHead>
                      <TableHead>Unit cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.items.map((gi) => (
                      <TableRow key={gi.id}>
                        <TableCell>
                          {gi.productName} — {gi.size}/{gi.color}
                        </TableCell>
                        <TableCell>{gi.quantityReceived}</TableCell>
                        <TableCell>
                          {gi.damagedQuantity > 0 ? (
                            <Badge variant="destructive">{gi.damagedQuantity}</Badge>
                          ) : (
                            0
                          )}
                        </TableCell>
                        <TableCell>₹{Number(gi.unitCost).toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
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
