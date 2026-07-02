import { listVendors } from "@/actions/vendors";
import { PurchaseOrderForm } from "@/components/purchases/po-form";

export default async function NewPurchaseOrderPage() {
  const vendors = await listVendors();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create purchase order</h1>
        <p className="text-sm text-muted-foreground">
          Select a vendor and add the products you want to order.
        </p>
      </div>
      <PurchaseOrderForm vendors={vendors} />
    </div>
  );
}
