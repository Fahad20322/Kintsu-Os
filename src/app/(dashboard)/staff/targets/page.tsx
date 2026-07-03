import { listStaff, listStaffTargets } from "@/actions/staff";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SetTargetDialog } from "@/components/staff/set-target-dialog";

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const periodMonth = month || new Date().toISOString().slice(0, 7);

  const [staff, targets] = await Promise.all([listStaff(), listStaffTargets(periodMonth)]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Sales targets</h1>
        <SetTargetDialog
          staff={staff.map((s) => ({ id: s.id, name: s.name }))}
          periodMonth={periodMonth}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="mb-4 flex max-w-xs items-center gap-2">
            <Input type="month" name="month" defaultValue={periodMonth} />
            <Button type="submit" variant="secondary">
              Go
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Achieved</TableHead>
                <TableHead className="w-48">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((t) => {
                const pct = Math.min(
                  100,
                  Math.round((t.achievedAmount / Number(t.targetAmount)) * 100)
                );
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.userName}</TableCell>
                    <TableCell>₹{Number(t.targetAmount).toLocaleString("en-IN")}</TableCell>
                    <TableCell>₹{t.achievedAmount.toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-2" />
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {targets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No targets set for this month
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
