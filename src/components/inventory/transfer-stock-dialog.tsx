"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftRight } from "lucide-react";
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
import { transferStock } from "@/actions/inventory";
import { VariantLookupField, type MatchedVariant } from "@/components/inventory/variant-lookup-field";

export function TransferStockDialog({
  warehouses,
}: {
  warehouses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [variant, setVariant] = React.useState<MatchedVariant>(null);
  const [fromWarehouseId, setFromWarehouseId] = React.useState("");
  const [toWarehouseId, setToWarehouseId] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function reset() {
    setVariant(null);
    setFromWarehouseId("");
    setToWarehouseId("");
    setQuantity(1);
  }

  async function handleSubmit() {
    if (!variant) {
      toast.error("Look up a product variant first");
      return;
    }
    if (!fromWarehouseId || !toWarehouseId) {
      toast.error("Select both a source and destination warehouse");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error("Source and destination warehouses must differ");
      return;
    }
    if (quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    setIsSubmitting(true);
    try {
      await transferStock({
        variantId: variant.variantId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
      });
      toast.success("Stock transferred");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not transfer stock");
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
          <ArrowLeftRight /> Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Transfer stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <VariantLookupField variant={variant} onFound={setVariant} />
          <div className="space-y-2">
            <Label>From warehouse</Label>
            <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Source warehouse" />
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
            <Label>To warehouse</Label>
            <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Destination warehouse" />
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
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Transferring..." : "Transfer stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
