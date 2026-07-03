import { listAttendance, listStaff } from "@/actions/staff";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AttendanceTable } from "@/components/staff/attendance-table";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const selectedDate = date || new Date().toISOString().slice(0, 10);

  const [staff, attendance] = await Promise.all([
    listStaff(),
    listAttendance(selectedDate),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>

      <Card>
        <CardContent className="pt-6">
          <form className="mb-4 flex max-w-xs items-center gap-2">
            <Input type="date" name="date" defaultValue={selectedDate} />
            <Button type="submit" variant="secondary">
              Go
            </Button>
          </form>

          <AttendanceTable
            date={selectedDate}
            staff={staff.map((s) => ({ id: s.id, name: s.name, role: s.role }))}
            attendance={attendance.map((a) => ({ ...a, note: a.note ?? null }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
