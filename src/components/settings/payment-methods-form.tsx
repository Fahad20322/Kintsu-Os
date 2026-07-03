"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { storeSettings } from "@/db/schema";
import {
  paymentMethodValues,
  paymentMethodsSchema,
  type PaymentMethodsInput,
} from "@/lib/validations/settings";
import { updatePaymentMethods } from "@/actions/settings";

type StoreSettingsRow = typeof storeSettings.$inferSelect;

const PAYMENT_METHOD_LABELS: Record<(typeof paymentMethodValues)[number], string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  GIFT_CARD: "Gift card",
  STORE_CREDIT: "Store credit",
  BANK_TRANSFER: "Bank transfer",
};

export function PaymentMethodsForm({ settings }: { settings: StoreSettingsRow }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<PaymentMethodsInput>({
    resolver: zodResolver(paymentMethodsSchema),
    defaultValues: {
      acceptedPaymentMethods: settings.acceptedPaymentMethods as PaymentMethodsInput["acceptedPaymentMethods"],
    },
  });

  const selected = form.watch("acceptedPaymentMethods");

  function toggle(method: (typeof paymentMethodValues)[number], checked: boolean) {
    const current = form.getValues("acceptedPaymentMethods");
    const next = checked
      ? [...current, method]
      : current.filter((m) => m !== method);
    form.setValue("acceptedPaymentMethods", next, { shouldValidate: true });
  }

  async function onSubmit(values: PaymentMethodsInput) {
    setIsSubmitting(true);
    try {
      await updatePaymentMethods(values);
      toast.success("Payment methods saved");
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
          <CardTitle>Payment methods</CardTitle>
          <CardDescription>
            Choose which payment methods cashiers can accept at POS checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {paymentMethodValues.map((method) => (
            <div key={method} className="flex items-center gap-2">
              <Checkbox
                id={`payment-method-${method}`}
                checked={selected.includes(method)}
                onCheckedChange={(checked) => toggle(method, checked === true)}
              />
              <Label htmlFor={`payment-method-${method}`} className="font-normal">
                {PAYMENT_METHOD_LABELS[method]}
              </Label>
            </div>
          ))}
          {form.formState.errors.acceptedPaymentMethods && (
            <p className="text-sm text-destructive sm:col-span-2">
              {form.formState.errors.acceptedPaymentMethods.message}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save payment methods"}
        </Button>
      </div>
    </form>
  );
}
