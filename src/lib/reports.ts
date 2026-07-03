export const REPORT_TYPES = [
  "SALES",
  "GST",
  "INVENTORY",
  "PROFIT",
  "PURCHASE",
  "VENDOR",
  "CUSTOMER",
  "BEST_SELLER",
  "DEAD_STOCK",
  "STAFF_SALES",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export type ReportResult = {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  summary?: { label: string; value: string }[];
};
