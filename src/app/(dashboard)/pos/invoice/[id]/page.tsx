import { notFound } from "next/navigation";
import { getSale } from "@/actions/pos";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PrintButton } from "@/components/pos/invoice-actions";
import { ReturnDialog } from "@/components/pos/return-dialog";
import { ExchangeDialog } from "@/components/pos/exchange-dialog";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSale(id);
  if (!data) notFound();

  const { sale, items, payments, customer, store, settings } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Invoice {sale.invoiceNumber}</h1>
        <PrintButton />
      </div>

      <div id="print-area" className="mx-auto max-w-2xl rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{store?.name}</h2>
            {settings?.gstin && (
              <p className="text-xs text-muted-foreground">GSTIN: {settings.gstin}</p>
            )}
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">{sale.invoiceNumber}</p>
            <p className="text-muted-foreground">
              {new Date(sale.createdAt).toLocaleString("en-IN")}
            </p>
            <Badge variant={sale.status === "COMPLETED" ? "success" : "warning"}>
              {sale.status.replace("_", " ")}
            </Badge>
          </div>
        </div>

        {customer && (
          <div className="mb-4 text-sm">
            <p className="font-medium">{customer.name}</p>
            <p className="text-muted-foreground">{customer.mobile}</p>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>GST</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="print:hidden">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const remaining = item.quantity - item.returnedQuantity;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.sku} · {item.size}/{item.color}
                      {item.returnedQuantity > 0 && (
                        <span className="ml-1 text-warning-foreground">
                          ({item.returnedQuantity} returned)
                        </span>
                      )}
                    </p>
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>₹{Number(item.unitPrice).toLocaleString("en-IN")}</TableCell>
                  <TableCell>₹{Number(item.gstAmount).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="font-medium">
                    ₹{Number(item.lineTotal).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="print:hidden">
                    {remaining > 0 && (
                      <div className="flex gap-1">
                        <ReturnDialog
                          saleItemId={item.id}
                          maxQuantity={remaining}
                          productLabel={item.productName}
                        />
                        <ExchangeDialog
                          originalSaleItemId={item.id}
                          maxQuantity={remaining}
                          productLabel={item.productName}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="ml-auto mt-4 w-56 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₹{Number(sale.subtotal).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span>-₹{Number(sale.discountAmount).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">GST</span>
            <span>₹{Number(sale.gstAmount).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between border-t pt-1 font-semibold">
            <span>Total</span>
            <span>₹{Number(sale.totalAmount).toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Payments</p>
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between text-sm">
              <span>{p.method.replace("_", " ")}</span>
              <span>₹{Number(p.amount).toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>

        {settings?.invoiceFooterNote && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {settings.invoiceFooterNote}
          </p>
        )}
      </div>
    </div>
  );
}
