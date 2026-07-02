"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { addVariant } from "@/actions/products";

export function AddVariantDialog({ productId }: { productId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [size, setSize] = React.useState("");
  const [color, setColor] = React.useState("");
  const [qty, setQty] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit() {
    if (!size || !color) {
      toast.error("Size and color are required");
      return;
    }
    setIsSubmitting(true);
    try {
      await addVariant(productId, { size, color, openingQuantity: qty });
      toast.success("Variant added");
      setOpen(false);
      setSize("");
      setColor("");
      setQty(0);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add variant");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus /> Add variant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add size/color variant</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Size</Label>
            <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="M" />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Maroon" />
          </div>
          <div className="space-y-2">
            <Label>Opening quantity</Label>
            <Input
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add variant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
