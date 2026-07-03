import { asc } from "drizzle-orm";
import { db } from "@/db";
import { customer } from "@/db/schema";
import { listTailors } from "@/actions/tailors";
import { BridalOrderForm } from "@/components/bridal/bridal-order-form";

export default async function NewBridalOrderPage() {
  const [customers, tailors] = await Promise.all([
    db
      .select({ id: customer.id, name: customer.name, mobile: customer.mobile })
      .from(customer)
      .orderBy(asc(customer.name)),
    listTailors(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New bridal order</h1>
        <p className="text-sm text-muted-foreground">
          Capture bride/groom details, outfit selection and measurements.
        </p>
      </div>
      <BridalOrderForm customers={customers} tailors={tailors} />
    </div>
  );
}
