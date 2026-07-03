import Link from "next/link";
import { CalendarCheck, ClipboardList, ScrollText } from "lucide-react";
import { listStaff } from "@/actions/staff";
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
import { AddStaffDialog } from "@/components/staff/add-staff-dialog";

export default async function StaffPage() {
  const staff = await listStaff();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">{staff.length} team members</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/staff/attendance">
              <CalendarCheck /> Attendance
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/staff/targets">
              <ClipboardList /> Targets
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/staff/audit-log">
              <ScrollText /> Audit log
            </Link>
          </Button>
          <AddStaffDialog />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>This month&apos;s sales</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s.role.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>₹{s.monthSales.toLocaleString("en-IN")}</TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? "success" : "outline"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {staff.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No staff members yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
