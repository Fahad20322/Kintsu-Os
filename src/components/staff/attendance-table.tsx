"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { markAttendance } from "@/actions/staff";
import { attendanceStatusValues } from "@/lib/validations/staff";

type StaffRow = { id: string; name: string; role: string };
type AttendanceRow = { userId: string; status: string; note: string | null };

export function AttendanceTable({
  date,
  staff,
  attendance,
}: {
  date: string;
  staff: StaffRow[];
  attendance: AttendanceRow[];
}) {
  const router = useRouter();
  const [statusMap, setStatusMap] = React.useState<Record<string, string>>(
    Object.fromEntries(attendance.map((a) => [a.userId, a.status]))
  );

  async function handleChange(userId: string, status: string) {
    setStatusMap((prev) => ({ ...prev, [userId]: status }));
    try {
      await markAttendance({ userId, date, status });
      toast.success("Attendance updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update attendance");
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.name}</TableCell>
            <TableCell>{s.role.replace("_", " ")}</TableCell>
            <TableCell>
              <Select
                value={statusMap[s.id] ?? "PRESENT"}
                onValueChange={(v) => handleChange(s.id, v)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {attendanceStatusValues.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
