import { notFound } from "next/navigation";
import {
  getCustomer,
  getCustomerFavoriteCategories,
  getCustomerPurchaseHistory,
} from "@/actions/customers";
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
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerData = await getCustomer(id);
  if (!customerData) notFound();

  const [purchases, favoriteCategories] = await Promise.all([
    getCustomerPurchaseHistory(id),
    getCustomerFavoriteCategories(id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{customerData.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{customerData.mobile}</p>
        </div>
        <EditCustomerDialog customer={customerData} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contact information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Attr label="Email" value={customerData.email} />
            <Attr label="Address" value={customerData.address} />
            <Attr label="City" value={customerData.city} />
            <Attr label="Birthday" value={formatDate(customerData.birthday)} />
            <Attr label="Anniversary" value={formatDate(customerData.anniversary)} />
            <Attr label="Preferred size" value={customerData.preferredSize} />
          </CardContent>
          {customerData.notes && (
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm">{customerData.notes}</p>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loyalty & spend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Loyalty points</span>
              <Badge variant="secondary">{customerData.loyaltyPoints} pts</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tier</span>
              <Badge variant={customerData.loyaltyTier ? "default" : "outline"}>
                {customerData.loyaltyTier?.name ?? "No tier"}
              </Badge>
            </div>
            <Attr
              label="Total spend"
              value={`₹${Number(customerData.totalSpend).toLocaleString("en-IN")}`}
            />
            <Attr label="Total orders" value={String(customerData.totalOrders)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Favorite categories</CardTitle>
        </CardHeader>
        <CardContent>
          {favoriteCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {favoriteCategories.map((c) => (
                <Badge key={c.categoryName} variant="secondary">
                  {c.categoryName} ({c.qty})
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No purchase data yet to determine favorite categories.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase history</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.invoiceNumber}</TableCell>
                    <TableCell>{p.createdAt.toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "COMPLETED" ? "success" : "warning"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>₹{Number(p.totalAmount).toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
                {purchases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No purchases yet — sales made at POS will appear here.
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

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
