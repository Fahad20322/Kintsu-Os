"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpFromLine } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordStockMovement } from "@/actions/inventory";
import { stockOutTypeValues, type StockMovementTypeValue } from "@/lib/validations/inventory";
import { VariantLookupField, type MatchedVariant } from "@/components/inventory/variant-lookup-field";

const TYPE_LABELS: Record<(typeof stockOutTypeValues)[number], string> = {
  ADJUSTMENT_OUT: "Manual adjustment / shrinkage",
  DAMAGE_OUT: "Damage",
};

export function StockOutDialog({
  warehouses,
}: {
  warehouses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [variant, setVariant] = React.useState<MatchedVariant>(null);
  const [warehouseId, setWarehouseId] = React.useState("");
  const [type, setType] = React.useState<StockMovementTypeValue>("DAMAGE_OUT");
  const [quantity, setQuantity] = React.useState(1);
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function reset() {
    setVariant(null);
    setWarehouseId("");
    setType("DAMAGE_OUT");
    setQuantity(1);
    setReason("");
  }

  async function handleSubmit() {
    if (!variant) {
      toast.error("Look up a product variant first");
      return;
    }
    if (!warehouseId) {
      toast.error("Select a warehouse");
      return;
    }
    if (quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    setIsSubmitting(true);
    try {
      await recordStockMovement({
        variantId: variant.variantId,
        warehouseId,
        type,
        quantity,
        reason: reason || undefined,
      });
      toast.success("Stock removed");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record stock out");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowUpFromLine /> Stock out / damage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Stock out / damage</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <VariantLookupField variant={variant} onFound={setVariant} />
          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as StockMovementTypeValue)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stockOutTypeValues.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Stained during trial"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Remove stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
