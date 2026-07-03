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
import type { store } from "@/db/schema";
import {
  storeDetailsSchema,
  type StoreDetailsFormValues,
  type StoreDetailsInput,
} from "@/lib/validations/settings";
import { updateStoreDetails } from "@/actions/settings";

type StoreRow = typeof store.$inferSelect;

export function StoreDetailsForm({ store }: { store: StoreRow }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<StoreDetailsFormValues, unknown, StoreDetailsInput>({
    resolver: zodResolver(storeDetailsSchema),
    defaultValues: {
      name: store.name,
      code: store.code,
      address: store.address ?? "",
      city: store.city ?? "",
      state: store.state ?? "",
      pincode: store.pincode ?? "",
      phone: store.phone ?? "",
      email: store.email ?? "",
    },
  });

  async function onSubmit(values: StoreDetailsInput) {
    setIsSubmitting(true);
    try {
      await updateStoreDetails(values);
      toast.success("Store details saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save store details");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Store details</CardTitle>
          <CardDescription>
            Basic profile information for this store, used on invoices and labels.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Store name</Label>
            <Input {...form.register("name")} placeholder="Kintsu Bridal Couture" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Store code</Label>
            <Input {...form.register("code")} placeholder="KOS-MAIN" />
            {form.formState.errors.code && (
              <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Input {...form.register("address")} placeholder="123 MG Road" />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input {...form.register("city")} />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input {...form.register("state")} />
          </div>
          <div className="space-y-2">
            <Label>Pincode</Label>
            <Input {...form.register("pincode")} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input {...form.register("phone")} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save store details"}
        </Button>
      </div>
    </form>
  );
}
