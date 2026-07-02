"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordVendorPayment } from "@/actions/vendors";
import {
  paymentMethodValues,
  vendorPaymentSchema,
  type VendorPaymentInput,
  type VendorPaymentFormValues,
} from "@/lib/validations/vendor";

export function RecordPaymentDialog({
  vendorId,
  purchaseOrders,
}: {
  vendorId: string;
  purchaseOrders: { id: string; poNumber: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<VendorPaymentFormValues, unknown, VendorPaymentInput>({
    resolver: zodResolver(vendorPaymentSchema),
    defaultValues: {
      vendorId,
      purchaseOrderId: "",
      amount: 0,
      method: "CASH",
      referenceNumber: "",
      note: "",
    },
  });

  async function onSubmit(values: VendorPaymentInput) {
    setIsSubmitting(true);
    try {
      await recordVendorPayment(values);
      toast.success("Payment recorded");
      setOpen(false);
      form.reset({
        vendorId,
        purchaseOrderId: "",
        amount: 0,
        method: "CASH",
        referenceNumber: "",
        note: "",
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus /> Record payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record vendor payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <Input type="number" step="0.01" {...form.register("amount")} />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select
              value={form.watch("method")}
              onValueChange={(v) => form.setValue("method", v as VendorPaymentInput["method"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethodValues.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {purchaseOrders.length > 0 && (
            <div className="space-y-2">
              <Label>Against purchase order (optional)</Label>
              <Select
                value={form.watch("purchaseOrderId") || undefined}
                onValueChange={(v) => form.setValue("purchaseOrderId", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No specific PO" />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.poNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Reference number</Label>
            <Input {...form.register("referenceNumber")} placeholder="UTR / cheque no." />
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Input {...form.register("note")} placeholder="Optional note" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
