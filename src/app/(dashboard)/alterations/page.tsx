import Link from "next/link";
import { listAlterations } from "@/actions/alterations";
import { listTailors } from "@/actions/tailors";
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
import { AlterationFilters } from "@/components/alterations/alteration-filters";
import { NewAlterationDialog } from "@/components/alterations/new-alteration-dialog";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  RECEIVED: "secondary",
  ASSIGNED: "outline",
  IN_PROGRESS: "warning",
  READY: "default",
  DELIVERED: "success",
};

export default async function AlterationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const [rows, tailors] = await Promise.all([
    listAlterations({ search: q, status }),
    listTailors(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alterations</h1>
          <p className="text-sm text-muted-foreground">{rows.length} alteration jobs</p>
        </div>
        <NewAlterationDialog tailors={tailors} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <AlterationFilters defaultSearch={q} defaultStatus={status} />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Tailor</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>Expected delivery</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer">
                    <TableCell className="font-mono text-xs">
                      <Link href={`/alterations/${a.id}`} className="hover:underline">
                        {a.jobNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {a.customerName ? (
                        <>
                          <p className="font-medium">{a.customerName}</p>
                          <p className="text-xs text-muted-foreground">{a.customerMobile}</p>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-56 truncate">{a.itemDescription}</TableCell>
                    <TableCell>{a.tailorName ?? "Unassigned"}</TableCell>
                    <TableCell>₹{Number(a.charge).toLocaleString("en-IN")}</TableCell>
                    <TableCell>{a.expectedDeliveryDate ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[a.status] ?? "default"}>
                        {a.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No alteration jobs yet. Create the first one to get started.
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
