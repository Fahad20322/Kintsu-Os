"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { runReport } from "@/actions/reports";
import { REPORT_TYPES, type ReportType, type ReportResult } from "@/lib/reports";
import { downloadCsv } from "@/lib/export/csv";
import { downloadExcel } from "@/lib/export/excel";

const REPORT_LABELS: Record<ReportType, string> = {
  SALES: "Sales (Daily / Monthly / Yearly)",
  GST: "GST",
  INVENTORY: "Inventory",
  PROFIT: "Profit",
  PURCHASE: "Purchase",
  VENDOR: "Vendor",
  CUSTOMER: "Customer",
  BEST_SELLER: "Best Seller",
  DEAD_STOCK: "Dead Stock",
  STAFF_SALES: "Staff Sales",
};

const DATE_RANGE_REPORTS = new Set<ReportType>(["SALES", "GST", "PROFIT", "PURCHASE", "BEST_SELLER", "STAFF_SALES"]);

function formatCell(value: unknown) {
  if (value instanceof Date) return value.toLocaleString("en-IN");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString("en-IN");
  }
  return String(value ?? "—");
}

export function ReportViewer() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(new Date().setDate(new Date().getDate() - 30))
    .toISOString()
    .slice(0, 10);

  const [type, setType] = React.useState<ReportType>("SALES");
  const [from, setFrom] = React.useState(monthAgo);
  const [to, setTo] = React.useState(today);
  const [result, setResult] = React.useState<ReportResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const loadReport = React.useCallback(async (reportType: ReportType, f: string, t: string) => {
    setIsLoading(true);
    try {
      const data = await runReport(reportType, { from: f, to: t });
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load report");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial/type-change data fetch, not a render-time derivation
    loadReport(type, from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function handleRunClick() {
    loadReport(type, from, to);
  }

  function handleExportCsv() {
    if (!result || result.rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    downloadCsv(`${type.toLowerCase()}-report`, result.rows);
  }

  function handleExportExcel() {
    if (!result || result.rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    downloadExcel(`${type.toLowerCase()}-report`, result.rows, REPORT_LABELS[type]);
  }

  return (
    <div className="space-y-4">
      <Card className="print:hidden">
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1">
            <Label className="text-xs">Report type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {REPORT_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {DATE_RANGE_REPORTS.has(type) && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <Button variant="secondary" onClick={handleRunClick} disabled={isLoading}>
                {isLoading ? "Running..." : "Run"}
              </Button>
            </>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={handleExportCsv}>
              <Download /> CSV
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet /> Excel
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Print / PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {result?.summary && (
        <div className="flex flex-wrap gap-4">
          {result.summary.map((s) => (
            <Card key={s.label} className="flex-1 min-w-[160px]">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-semibold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div id="print-area" className="overflow-x-auto">
            <h2 className="mb-3 hidden text-lg font-semibold print:block">
              {REPORT_LABELS[type]} Report
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  {result?.columns.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result?.rows.map((row, i) => (
                  <TableRow key={i}>
                    {result.columns.map((c) => (
                      <TableCell key={c.key}>{formatCell(row[c.key])}</TableCell>
                    ))}
                  </TableRow>
                ))}
                {(!result || result.rows.length === 0) && !isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={result?.columns.length || 1}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No data for this report
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
