import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendor } from "@/actions/vendors";
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
import { RecordPaymentDialog } from "@/components/vendors/record-payment-dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DRAFT: "secondary",
  SENT: "default",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "destructive",
};

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getVendor(id);
  if (!data) notFound();

  const { vendor, pendingBalance, purchaseOrders, payments } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{vendor.name}</h1>
            <Badge variant={pendingBalance > 0 ? "warning" : "success"}>
              {pendingBalance > 0
                ? `₹${pendingBalance.toLocaleString("en-IN")} pending`
                : "Settled"}
            </Badge>
          </div>
          {vendor.gstin && (
            <p className="font-mono text-sm text-muted-foreground">{vendor.gstin}</p>
          )}
        </div>
        <RecordPaymentDialog
          vendorId={vendor.id}
          purchaseOrders={purchaseOrders.map((po) => ({ id: po.id, poNumber: po.poNumber }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contact information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Attr label="Contact person" value={vendor.contactPerson} />
            <Attr label="Mobile" value={vendor.mobile} />
            <Attr label="Email" value={vendor.email} />
            <Attr label="Address" value={vendor.address} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Attr
              label="Opening balance"
              value={`₹${Number(vendor.openingBalance).toLocaleString("en-IN")}`}
            />
            <Attr
              label="Pending balance"
              value={`₹${pendingBalance.toLocaleString("en-IN")}`}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>
                      <Link href={`/purchases/${po.id}`} className="font-medium hover:underline">
                        {po.poNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[po.status] ?? "default"}>
                        {po.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{po.expectedDate ?? "—"}</TableCell>
                    <TableCell>₹{Number(po.totalAmount).toLocaleString("en-IN")}</TableCell>
                    <TableCell>{new Date(po.createdAt).toLocaleDateString("en-IN")}</TableCell>
                  </TableRow>
                ))}
                {purchaseOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No purchase orders for this vendor yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.createdAt).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>₹{Number(p.amount).toLocaleString("en-IN")}</TableCell>
                    <TableCell>{p.method.replace("_", " ")}</TableCell>
                    <TableCell>{p.referenceNumber || "—"}</TableCell>
                    <TableCell>{p.note || "—"}</TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No payments recorded yet.
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

function Attr({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
