"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { storeSettings } from "@/db/schema";
import {
  barcodePrinterSchema,
  type BarcodePrinterFormValues,
  type BarcodePrinterInput,
} from "@/lib/validations/settings";
import { updateBarcodePrinterSettings } from "@/actions/settings";

type StoreSettingsRow = typeof storeSettings.$inferSelect;

export function BarcodePrinterForm({ settings }: { settings: StoreSettingsRow }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<BarcodePrinterFormValues, unknown, BarcodePrinterInput>({
    resolver: zodResolver(barcodePrinterSchema),
    defaultValues: {
      barcodePrefix: settings.barcodePrefix,
      barcodeSymbology: settings.barcodeSymbology,
      labelWidthMm: Number(settings.labelWidthMm),
      labelHeightMm: Number(settings.labelHeightMm),
      thermalPrinterWidthMm: Number(settings.thermalPrinterWidthMm),
      printerName: settings.printerName ?? "",
    },
  });

  async function onSubmit(values: BarcodePrinterInput) {
    setIsSubmitting(true);
    try {
      await updateBarcodePrinterSettings(values);
      toast.success("Barcode & printer settings saved");
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
          <CardTitle>Barcode & printer</CardTitle>
          <CardDescription>
            Barcode label sizing and thermal/label printer configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Barcode prefix</Label>
            <Input {...form.register("barcodePrefix")} placeholder="KOS" />
            {form.formState.errors.barcodePrefix && (
              <p className="text-sm text-destructive">
                {form.formState.errors.barcodePrefix.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Barcode symbology</Label>
            <Input {...form.register("barcodeSymbology")} placeholder="CODE128" />
          </div>
          <div className="space-y-2">
            <Label>Label width (mm)</Label>
            <Input type="number" step="0.01" {...form.register("labelWidthMm")} />
            {form.formState.errors.labelWidthMm && (
              <p className="text-sm text-destructive">
                {form.formState.errors.labelWidthMm.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Label height (mm)</Label>
            <Input type="number" step="0.01" {...form.register("labelHeightMm")} />
            {form.formState.errors.labelHeightMm && (
              <p className="text-sm text-destructive">
                {form.formState.errors.labelHeightMm.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Thermal printer width (mm)</Label>
            <Input type="number" step="0.01" {...form.register("thermalPrinterWidthMm")} />
            {form.formState.errors.thermalPrinterWidthMm && (
              <p className="text-sm text-destructive">
                {form.formState.errors.thermalPrinterWidthMm.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Printer name</Label>
            <Input {...form.register("printerName")} placeholder="EPSON TM-T88" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save barcode & printer settings"}
        </Button>
      </div>
    </form>
  );
}
