import { ReportViewer } from "@/components/reports/report-viewer";

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Sales, GST, inventory, profit, purchases, vendors, customers and more.
        </p>
      </div>
      <ReportViewer />
    </div>
  );
}
