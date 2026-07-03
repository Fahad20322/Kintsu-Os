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
  discountLoyaltySchema,
  type DiscountLoyaltyFormValues,
  type DiscountLoyaltyInput,
} from "@/lib/validations/settings";
import { updateDiscountLoyaltySettings } from "@/actions/settings";

type StoreSettingsRow = typeof storeSettings.$inferSelect;

export function DiscountLoyaltyForm({ settings }: { settings: StoreSettingsRow }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<DiscountLoyaltyFormValues, unknown, DiscountLoyaltyInput>({
    resolver: zodResolver(discountLoyaltySchema),
    defaultValues: {
      maxDiscountPercent: Number(settings.maxDiscountPercent),
      loyaltyPointsPerRupee: Number(settings.loyaltyPointsPerRupee),
      loyaltyRedemptionValue: Number(settings.loyaltyRedemptionValue),
      lowStockThreshold: Number(settings.lowStockThreshold),
    },
  });

  async function onSubmit(values: DiscountLoyaltyInput) {
    setIsSubmitting(true);
    try {
      await updateDiscountLoyaltySettings(values);
      toast.success("Discount & loyalty settings saved");
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
          <CardTitle>Discounts & loyalty</CardTitle>
          <CardDescription>
            Caps on cashier discretionary discounts, loyalty accrual and low-stock alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Max discount (%)</Label>
            <Input type="number" step="0.01" {...form.register("maxDiscountPercent")} />
            <p className="text-xs text-muted-foreground">
              Cashiers cannot exceed this discount at POS unless they hold the discount
              override permission.
            </p>
            {form.formState.errors.maxDiscountPercent && (
              <p className="text-sm text-destructive">
                {form.formState.errors.maxDiscountPercent.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Loyalty points per ₹ spent</Label>
            <Input type="number" step="0.001" {...form.register("loyaltyPointsPerRupee")} />
          </div>
          <div className="space-y-2">
            <Label>Loyalty redemption value (₹ per point)</Label>
            <Input type="number" step="0.001" {...form.register("loyaltyRedemptionValue")} />
          </div>
          <div className="space-y-2">
            <Label>Low stock threshold (units)</Label>
            <Input type="number" step="1" {...form.register("lowStockThreshold")} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save discount & loyalty settings"}
        </Button>
      </div>
    </form>
  );
}
