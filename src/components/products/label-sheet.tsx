"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type LabelVariant = {
  id: string;
  size: string;
  color: string;
  sku: string;
  barcode: string;
};

export function LabelSheet({
  productName,
  price,
  variants,
}: {
  productName: string;
  price: string;
  variants: LabelVariant[];
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold">Barcode labels — {productName}</h1>
        <Button onClick={() => window.print()}>
          <Printer /> Print
        </Button>
      </div>
      <div id="print-area" className="grid grid-cols-3 gap-3">
        {variants.map((v) => (
          <div
            key={v.id}
            className="flex flex-col items-center gap-1 rounded-md border p-2 text-center"
          >
            <p className="text-xs font-semibold">{productName}</p>
            <p className="text-[10px] text-muted-foreground">
              {v.size} / {v.color}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/barcode/${encodeURIComponent(v.barcode)}`}
              alt={v.barcode}
              className="h-10"
            />
            <p className="text-[10px]">{v.sku}</p>
            <p className="text-xs font-semibold">₹{price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
