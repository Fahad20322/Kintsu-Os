"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelPurchaseOrder } from "@/actions/purchases";

export function CancelPoButton({ purchaseOrderId }: { purchaseOrderId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleCancel() {
    if (!window.confirm("Cancel this purchase order? This cannot be undone.")) return;
    setIsSubmitting(true);
    try {
      await cancelPurchaseOrder(purchaseOrderId);
      toast.success("Purchase order cancelled");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel purchase order");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button variant="outline" disabled={isSubmitting} onClick={handleCancel}>
      <Ban /> Cancel PO
    </Button>
  );
}
