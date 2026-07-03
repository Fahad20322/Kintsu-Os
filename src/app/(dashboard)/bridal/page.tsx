import Link from "next/link";
import { differenceInDays } from "date-fns";
import { Plus } from "lucide-react";
import { listBridalOrders } from "@/actions/bridal";
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
import { BridalFilters } from "@/components/bridal/bridal-filters";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  SELECTION: "secondary",
  MEASUREMENT: "outline",
  STITCHING: "warning",
  EMBROIDERY: "warning",
  TRIAL: "default",
  READY: "default",
  DELIVERED: "success",
};

export default async function BridalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const rows = await listBridalOrders({ search: q, status });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bridal orders</h1>
          <p className="text-sm text-muted-foreground">{rows.length} bridal orders</p>
        </div>
        <Button asChild>
          <Link href="/bridal/new">
            <Plus /> New bridal order
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <BridalFilters defaultSearch={q} defaultStatus={status} />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bride</TableHead>
                  <TableHead>Groom</TableHead>
                  <TableHead>Wedding date</TableHead>
                  <TableHead>Tailor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pending amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => {
                  const daysToWedding = differenceInDays(
                    new Date(o.weddingDate),
                    new Date()
                  );
                  const isUrgent =
                    daysToWedding >= 0 && daysToWedding <= 14 && o.status !== "DELIVERED";
                  return (
                    <TableRow key={o.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/bridal/${o.id}`} className="font-medium hover:underline">
                          {o.brideName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{o.brideMobile}</p>
                      </TableCell>
                      <TableCell>{o.groomName ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{o.weddingDate}</span>
                          {isUrgent && (
                            <Badge variant="warning">{daysToWedding}d left</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{o.tailor?.name ?? "Unassigned"}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[o.status] ?? "default"}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        ₹{o.pendingAmount.toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No bridal orders yet. Create the first one to get started.
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
