"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { receiveGrn } from "@/actions/purchases";
import {
  grnReceiveSchema,
  type GrnReceiveInput,
  type GrnReceiveFormValues,
} from "@/lib/validations/vendor";

export type ReceivableItem = {
  purchaseOrderItemId: string;
  variantId: string;
  label: string;
  remaining: number;
};

export function ReceiveGrnDialog({
  purchaseOrderId,
  items,
  warehouses,
}: {
  purchaseOrderId: string;
  items: ReceivableItem[];
  warehouses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultItems: GrnReceiveFormValues["items"] = items.map((item) => ({
    purchaseOrderItemId: item.purchaseOrderItemId,
    variantId: item.variantId,
    quantityReceived: 0,
    damagedQuantity: 0,
  }));

  const form = useForm<GrnReceiveFormValues, unknown, GrnReceiveInput>({
    resolver: zodResolver(grnReceiveSchema),
    defaultValues: {
      purchaseOrderId,
      warehouseId: warehouses[0]?.id ?? "",
      notes: "",
      items: defaultItems,
    },
  });

  async function onSubmit(values: GrnReceiveInput) {
    setIsSubmitting(true);
    try {
      await receiveGrn(values);
      toast.success("Stock received");
      setOpen(false);
      form.reset({
        purchaseOrderId,
        warehouseId: warehouses[0]?.id ?? "",
        notes: "",
        items: defaultItems,
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not receive stock");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={items.length === 0 || warehouses.length === 0}>
          <PackageCheck /> Receive stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receive stock (GRN)</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select
                value={form.watch("warehouseId")}
                onValueChange={(v) => form.setValue("warehouseId", v)}
              >
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
              {form.formState.errors.warehouseId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.warehouseId.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea {...form.register("notes")} rows={1} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Quantity received</TableHead>
                  <TableHead>Damaged</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.purchaseOrderItemId}>
                    <TableCell className="text-sm">{item.label}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.remaining}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-24"
                        {...form.register(`items.${index}.quantityReceived`)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-24"
                        {...form.register(`items.${index}.damagedQuantity`)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Receiving..." : "Confirm receipt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
