import Link from "next/link";
import { searchSales } from "@/actions/pos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PosHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const sales = await searchSales(q ?? "");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Sale history</h1>
      <Card>
        <CardContent className="pt-6">
          <form className="mb-4 flex max-w-sm gap-2">
            <Input name="q" defaultValue={q} placeholder="Invoice, customer name or mobile" />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/pos/invoice/${s.id}`} className="font-medium hover:underline">
                        {s.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{s.customerName ?? "Walk-in"}</TableCell>
                    <TableCell>₹{Number(s.totalAmount).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "COMPLETED" ? "success" : "warning"}>
                        {s.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(s.createdAt).toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No sales yet
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
