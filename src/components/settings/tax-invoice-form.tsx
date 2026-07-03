"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { storeSettings } from "@/db/schema";
import {
  taxInvoiceSchema,
  type TaxInvoiceFormValues,
  type TaxInvoiceInput,
} from "@/lib/validations/settings";
import { updateTaxInvoiceSettings } from "@/actions/settings";

type StoreSettingsRow = typeof storeSettings.$inferSelect;

export function TaxInvoiceForm({ settings }: { settings: StoreSettingsRow }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<TaxInvoiceFormValues, unknown, TaxInvoiceInput>({
    resolver: zodResolver(taxInvoiceSchema),
    defaultValues: {
      gstin: settings.gstin ?? "",
      defaultGstRate: Number(settings.defaultGstRate),
      invoicePrefix: settings.invoicePrefix,
      invoiceNextNumber: Number(settings.invoiceNextNumber),
      invoiceFooterNote: settings.invoiceFooterNote ?? "",
      invoiceLogoUrl: settings.invoiceLogoUrl ?? "",
    },
  });

  async function onSubmit(values: TaxInvoiceInput) {
    setIsSubmitting(true);
    try {
      await updateTaxInvoiceSettings(values);
      toast.success("Tax & invoice settings saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tax & invoice</CardTitle>
          <CardDescription>
            GST registration, default tax rate and invoice numbering.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>GSTIN</Label>
            <Input {...form.register("gstin")} placeholder="29ABCDE1234F1Z5" />
          </div>
          <div className="space-y-2">
            <Label>Default GST rate (%)</Label>
            <Input type="number" step="0.01" {...form.register("defaultGstRate")} />
            {form.formState.errors.defaultGstRate && (
              <p className="text-sm text-destructive">
                {form.formState.errors.defaultGstRate.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Invoice prefix</Label>
            <Input {...form.register("invoicePrefix")} placeholder="INV" />
            {form.formState.errors.invoicePrefix && (
              <p className="text-sm text-destructive">
                {form.formState.errors.invoicePrefix.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Next invoice number</Label>
            <Input type="number" step="1" {...form.register("invoiceNextNumber")} />
            <p className="text-xs text-muted-foreground">
              Auto-increments on every POS sale. Only change this to manually correct
              the sequence.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Invoice footer note</Label>
            <Textarea {...form.register("invoiceFooterNote")} rows={2} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Invoice logo URL</Label>
            <Input {...form.register("invoiceLogoUrl")} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save tax & invoice settings"}
        </Button>
      </div>
    </form>
  );
}
