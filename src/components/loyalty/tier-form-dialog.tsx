"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createLoyaltyTier, updateLoyaltyTier } from "@/actions/loyalty";
import {
  loyaltyTierSchema,
  type LoyaltyTierInput,
  type LoyaltyTierFormValues,
} from "@/lib/validations/loyalty";

export function TierFormDialog({
  tier,
}: {
  tier?: { id: string; name: string; minSpend: string; pointsMultiplier: string; benefits: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<LoyaltyTierFormValues, unknown, LoyaltyTierInput>({
    resolver: zodResolver(loyaltyTierSchema),
    defaultValues: {
      name: tier?.name ?? "",
      minSpend: tier ? Number(tier.minSpend) : 0,
      pointsMultiplier: tier ? Number(tier.pointsMultiplier) : 1,
      benefits: tier?.benefits ?? "",
    },
  });

  async function onSubmit(values: LoyaltyTierInput) {
    setIsSubmitting(true);
    try {
      if (tier) {
        await updateLoyaltyTier(tier.id, values);
      } else {
        await createLoyaltyTier(values);
      }
      toast.success(tier ? "Tier updated" : "Tier created");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save tier");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={tier ? "outline" : "default"} size={tier ? "sm" : "default"}>
          {tier ? "Edit" : (
            <>
              <Plus /> Add tier
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{tier ? "Edit tier" : "New loyalty tier"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tier name</FormLabel>
                  <FormControl>
                    <Input placeholder="Gold" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minSpend"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum lifetime spend (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value as number} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pointsMultiplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Points multiplier</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} value={field.value as number} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="benefits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefits (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
