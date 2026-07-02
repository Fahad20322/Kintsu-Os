import Link from "next/link";
import { Search } from "lucide-react";
import { listVendors } from "@/actions/vendors";
import { Input } from "@/components/ui/input";
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
import { AddVendorDialog } from "@/components/vendors/add-vendor-dialog";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const vendors = await listVendors(q);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground">{vendors.length} vendors on record</p>
        </div>
        <AddVendorDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="mb-4 flex max-w-sm items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search by name, contact or mobile"
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact person</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Opening balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/vendors/${v.id}`} className="font-medium hover:underline">
                        {v.name}
                      </Link>
                    </TableCell>
                    <TableCell>{v.contactPerson || "—"}</TableCell>
                    <TableCell>{v.mobile || "—"}</TableCell>
                    <TableCell>{v.email || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{v.gstin || "—"}</TableCell>
                    <TableCell>
                      ₹{Number(v.openingBalance).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
                {vendors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No vendors yet. Add your first vendor to get started.
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
