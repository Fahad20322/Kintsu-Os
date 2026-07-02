"use client";

import * as React from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findVariantByCode } from "@/actions/inventory";

export type MatchedVariant = Awaited<ReturnType<typeof findVariantByCode>>;

/**
 * Shared barcode/SKU lookup control used by the stock-in, stock-out and
 * transfer dialogs. There is no product search combobox in the repo yet, so
 * this keeps things simple: type or scan a code, resolve it to a variant via
 * the findVariantByCode server action, and surface the match (or a "not
 * found" toast).
 */
export function VariantLookupField({
  variant,
  onFound,
}: {
  variant: MatchedVariant;
  onFound: (variant: MatchedVariant) => void;
}) {
  const [code, setCode] = React.useState("");
  const [isLooking, setIsLooking] = React.useState(false);

  async function handleLookup() {
    if (!code.trim()) {
      toast.error("Enter a barcode or SKU");
      return;
    }
    setIsLooking(true);
    try {
      const found = await findVariantByCode(code);
      if (!found) {
        toast.error("No product variant found for that code");
        onFound(null);
        return;
      }
      onFound(found);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setIsLooking(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>Barcode / SKU</Label>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleLookup();
            }
          }}
          placeholder="Scan or type barcode/SKU"
        />
        <Button type="button" variant="secondary" onClick={handleLookup} disabled={isLooking}>
          <Search /> {isLooking ? "..." : "Find"}
        </Button>
      </div>
      {variant && (
        <p className="text-sm text-muted-foreground">
          Matched: <span className="font-medium text-foreground">{variant.productName}</span> —{" "}
          {variant.size} / {variant.color} ({variant.sku})
        </p>
      )}
    </div>
  );
}
