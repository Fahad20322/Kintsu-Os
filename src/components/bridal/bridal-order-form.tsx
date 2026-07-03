"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  bridalOrderSchema,
  type BridalOrderInput,
  type BridalOrderFormValues,
} from "@/lib/validations/bridal";
import { createBridalOrder } from "@/actions/bridal";

type Option = { id: string; name: string; mobile?: string | null };

export function BridalOrderForm({
  customers,
  tailors,
}: {
  customers: Option[];
  tailors: Option[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<BridalOrderFormValues, unknown, BridalOrderInput>({
    resolver: zodResolver(bridalOrderSchema),
    defaultValues: {
      brideName: "",
      brideMobile: "",
      groomName: "",
      groomMobile: "",
      weddingDate: "",
      outfitDescription: "",
      fabric: "",
      embroideryDetails: "",
      measurements: {
        bust: "",
        waist: "",
        hips: "",
        shoulder: "",
        sleeveLength: "",
        blouseLength: "",
      },
      totalAmount: 0,
      advancePaid: 0,
      deliveryDate: "",
      notes: "",
    },
  });

  async function onSubmit(values: BridalOrderInput) {
    setIsSubmitting(true);
    try {
      const created = await createBridalOrder(values);
      toast.success("Bridal order created");
      router.push(`/bridal/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create bridal order");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bride & groom details</CardTitle>
          <CardDescription>Contact details and wedding date.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Bride&apos;s name</Label>
            <Input {...form.register("brideName")} placeholder="Ananya Sharma" />
            {form.formState.errors.brideName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.brideName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Bride&apos;s mobile</Label>
            <Input {...form.register("brideMobile")} placeholder="98765 43210" />
          </div>
          <div className="space-y-2">
            <Label>Groom&apos;s name</Label>
            <Input {...form.register("groomName")} placeholder="Rohan Verma" />
          </div>
          <div className="space-y-2">
            <Label>Groom&apos;s mobile</Label>
            <Input {...form.register("groomMobile")} placeholder="98765 43211" />
          </div>
          <div className="space-y-2">
            <Label>Wedding date</Label>
            <Input type="date" {...form.register("weddingDate")} />
            {form.formState.errors.weddingDate && (
              <p className="text-sm text-destructive">
                {form.formState.errors.weddingDate.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Link existing customer (optional)</Label>
            <Select
              value={form.watch("customerId")}
              onValueChange={(v) => form.setValue("customerId", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.mobile ? `(${c.mobile})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outfit details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Outfit description</Label>
            <Textarea
              {...form.register("outfitDescription")}
              rows={3}
              placeholder="Red bridal lehenga with heavy zari work"
            />
            {form.formState.errors.outfitDescription && (
              <p className="text-sm text-destructive">
                {form.formState.errors.outfitDescription.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Fabric</Label>
            <Input {...form.register("fabric")} placeholder="Silk, Velvet" />
          </div>
          <div className="space-y-2">
            <Label>Tailor assignment</Label>
            <Select
              value={form.watch("tailorId")}
              onValueChange={(v) => form.setValue("tailorId", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select tailor" />
              </SelectTrigger>
              <SelectContent>
                {tailors.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Embroidery details</Label>
            <Textarea
              {...form.register("embroideryDetails")}
              rows={2}
              placeholder="Zardozi work on dupatta and border"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Measurements</CardTitle>
          <CardDescription>All fields optional, free-form values.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Bust</Label>
            <Input {...form.register("measurements.bust")} placeholder="36 in" />
          </div>
          <div className="space-y-2">
            <Label>Waist</Label>
            <Input {...form.register("measurements.waist")} placeholder="30 in" />
          </div>
          <div className="space-y-2">
            <Label>Hips</Label>
            <Input {...form.register("measurements.hips")} placeholder="38 in" />
          </div>
          <div className="space-y-2">
            <Label>Shoulder</Label>
            <Input {...form.register("measurements.shoulder")} placeholder="14 in" />
          </div>
          <div className="space-y-2">
            <Label>Sleeve length</Label>
            <Input {...form.register("measurements.sleeveLength")} placeholder="18 in" />
          </div>
          <div className="space-y-2">
            <Label>Blouse length</Label>
            <Input {...form.register("measurements.blouseLength")} placeholder="15 in" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing & delivery</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Total amount (₹)</Label>
            <Input type="number" step="0.01" {...form.register("totalAmount")} />
            {form.formState.errors.totalAmount && (
              <p className="text-sm text-destructive">
                {form.formState.errors.totalAmount.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Advance paid (₹)</Label>
            <Input type="number" step="0.01" {...form.register("advancePaid")} />
            {form.formState.errors.advancePaid && (
              <p className="text-sm text-destructive">
                {form.formState.errors.advancePaid.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Expected delivery date</Label>
            <Input type="date" {...form.register("deliveryDate")} />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Create bridal order"}
        </Button>
      </div>
    </form>
  );
}
