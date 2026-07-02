"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { createPurchaseOrder, findVariantByCode } from "@/actions/purchases";
import type { PurchaseOrderInput } from "@/lib/validations/vendor";

const poFormItemSchema = z.object({
  code: z.string().min(1, "Enter a SKU or barcode"),
  variantId: z.string().min(1, "Look up a valid product first"),
  productLabel: z.string().optional(),
  quantityOrdered: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0"),
  unitCost: z.coerce.number().min(0, "Unit cost cannot be negative"),
});

const poFormSchema = z.object({
  vendorId: z.string().min(1, "Select a vendor"),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(poFormItemSchema).min(1, "Add at least one line item"),
});

type PoFormOutput = z.output<typeof poFormSchema>;
type PoFormValues = z.input<typeof poFormSchema>;

const emptyItem: PoFormValues["items"][number] = {
  code: "",
  variantId: "",
  productLabel: "",
  quantityOrdered: 1,
  unitCost: 0,
};

export function PurchaseOrderForm({
  vendors,
}: {
  vendors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lookingUp, setLookingUp] = React.useState<number | null>(null);

  const form = useForm<PoFormValues, unknown, PoFormOutput>({
    resolver: zodResolver(poFormSchema),
    defaultValues: {
      vendorId: "",
      expectedDate: "",
      notes: "",
      items: [emptyItem],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");
  const total = items.reduce(
    (sum, item) => sum + (Number(item.quantityOrdered) || 0) * (Number(item.unitCost) || 0),
    0
  );

  async function lookupVariant(index: number) {
    const code = form.getValues(`items.${index}.code`)?.trim();
    if (!code) {
      toast.error("Enter a SKU or barcode first");
      return;
    }
    setLookingUp(index);
    try {
      const result = await findVariantByCode(code);
      if (!result) {
        toast.error(`No product found for "${code}"`);
        form.setValue(`items.${index}.variantId`, "");
        form.setValue(`items.${index}.productLabel`, "");
        return;
      }
      form.setValue(`items.${index}.variantId`, result.variantId);
      form.setValue(
        `items.${index}.productLabel`,
        `${result.productName} — ${result.size}/${result.color} (${result.sku})`
      );
      const currentUnitCost = form.getValues(`items.${index}.unitCost`);
      if (!currentUnitCost) {
        form.setValue(`items.${index}.unitCost`, Number(result.purchaseCost));
      }
      toast.success("Product found");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLookingUp(null);
    }
  }

  async function onSubmit(values: PoFormOutput) {
    setIsSubmitting(true);
    try {
      const payload: PurchaseOrderInput = {
        vendorId: values.vendorId,
        expectedDate: values.expectedDate,
        notes: values.notes,
        items: values.items.map((item) => ({
          variantId: item.variantId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
        })),
      };
      const created = await createPurchaseOrder(payload);
      toast.success("Purchase order created");
      router.push(`/purchases/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create purchase order");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Purchase order details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Vendor</Label>
            <Select
              value={form.watch("vendorId")}
              onValueChange={(v) => form.setValue("vendorId", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.vendorId && (
              <p className="text-sm text-destructive">{form.formState.errors.vendorId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Expected date</Label>
            <Input type="date" {...form.register("expectedDate")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Line items</CardTitle>
            <CardDescription>
              Enter the SKU or barcode for each product, then look it up to resolve unit cost.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyItem)}>
            <Plus /> Add line
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU / barcode</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit cost</TableHead>
                  <TableHead>Line total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const rowQty = Number(form.watch(`items.${index}.quantityOrdered`)) || 0;
                  const rowCost = Number(form.watch(`items.${index}.unitCost`)) || 0;
                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            {...form.register(`items.${index}.code`)}
                            placeholder="SKU or barcode"
                            className="w-36"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Look up product"
                            disabled={lookingUp === index}
                            onClick={() => lookupVariant(index)}
                          >
                            <Search className="size-4" />
                          </Button>
                        </div>
                        {form.formState.errors.items?.[index]?.variantId && (
                          <p className="mt-1 text-xs text-destructive">
                            {form.formState.errors.items[index]?.variantId?.message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {form.watch(`items.${index}.productLabel`) || "Not resolved"}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-20"
                          {...form.register(`items.${index}.quantityOrdered`)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          {...form.register(`items.${index}.unitCost`)}
                        />
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        ₹{(rowQty * rowCost).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {form.formState.errors.items?.message && (
            <p className="mt-2 text-sm text-destructive">{form.formState.errors.items.message}</p>
          )}
          <div className="mt-4 flex justify-end text-sm">
            <span className="text-muted-foreground">
              Total:&nbsp;
              <span className="font-semibold text-foreground">
                ₹{total.toLocaleString("en-IN")}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Create purchase order"}
        </Button>
      </div>
    </form>
  );
}
