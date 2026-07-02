"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { findVariantByCode } from "@/actions/pos";
import { processExchange } from "@/actions/returns";

export function ExchangeDialog({
  originalSaleItemId,
  maxQuantity,
  productLabel,
}: {
  originalSaleItemId: string;
  maxQuantity: number;
  productLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [returnedQuantity, setReturnedQuantity] = React.useState(1);
  const [code, setCode] = React.useState("");
  const [newVariant, setNewVariant] = React.useState<Awaited<
    ReturnType<typeof findVariantByCode>
  > | null>(null);
  const [newQuantity, setNewQuantity] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleLookup() {
    const variant = await findVariantByCode(code.trim());
    if (!variant) {
      toast.error("No product found for this barcode/SKU");
      return;
    }
    setNewVariant(variant);
  }

  async function handleSubmit() {
    if (!newVariant) {
      toast.error("Look up the new product first");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await processExchange({
        originalSaleItemId,
        returnedQuantity,
        newVariantId: newVariant.variantId,
        newQuantity,
        newUnitPrice: newVariant.unitPrice,
        newGstRate: newVariant.gstRate,
      });
      const diff = result.priceDifference;
      toast.success(
        diff > 0
          ? `Collect additional ₹${diff}`
          : diff < 0
            ? `Refund ₹${Math.abs(diff)}`
            : "Exchange completed, no price difference"
      );
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not process exchange");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Repeat /> Exchange
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Exchange {productLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Return quantity (max {maxQuantity})</Label>
            <Input
              type="number"
              min={1}
              max={maxQuantity}
              value={returnedQuantity}
              onChange={(e) =>
                setReturnedQuantity(Math.min(maxQuantity, Math.max(1, Number(e.target.value))))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>New item barcode / SKU</Label>
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
              <Button type="button" variant="outline" onClick={handleLookup}>
                Find
              </Button>
            </div>
            {newVariant && (
              <p className="text-xs text-muted-foreground">
                {newVariant.productName} · {newVariant.size}/{newVariant.color} · ₹
                {newVariant.unitPrice}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>New item quantity</Label>
            <Input
              type="number"
              min={1}
              value={newQuantity}
              onChange={(e) => setNewQuantity(Math.max(1, Number(e.target.value)))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Confirm exchange"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
