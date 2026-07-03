"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAlteration, searchCustomersForAlteration } from "@/actions/alterations";
import { AddTailorDialog } from "@/components/alterations/add-tailor-dialog";
import {
  alterationSchema,
  type AlterationFormValues,
  type AlterationInput,
} from "@/lib/validations/alteration";

type Tailor = { id: string; name: string; mobile: string | null; specialization: string | null };
type CustomerOption = { id: string; name: string; mobile: string };

const defaultValues: AlterationFormValues = {
  customerId: "",
  itemDescription: "",
  alterationDetails: "",
  tailorId: "",
  charge: 0,
  expectedDeliveryDate: "",
};

export function NewAlterationDialog({ tailors: initialTailors }: { tailors: Tailor[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [tailors, setTailors] = React.useState(initialTailors);

  const [customerQuery, setCustomerQuery] = React.useState("");
  const [customerResults, setCustomerResults] = React.useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerOption | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = React.useState(false);

  const form = useForm<AlterationFormValues, unknown, AlterationInput>({
    resolver: zodResolver(alterationSchema),
    defaultValues,
  });

  function reset() {
    form.reset(defaultValues);
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerResults([]);
  }

  async function handleFindCustomer() {
    if (!customerQuery.trim()) return;
    setIsSearchingCustomer(true);
    try {
      const results = await searchCustomersForAlteration(customerQuery.trim());
      setCustomerResults(results);
      if (results.length === 0) {
        toast.error("No matching customers found");
      }
    } catch {
      toast.error("Could not search customers");
    } finally {
      setIsSearchingCustomer(false);
    }
  }

  async function onSubmit(values: AlterationInput) {
    setIsSubmitting(true);
    try {
      await createAlteration(values);
      toast.success("Alteration job created");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create alteration");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus /> New alteration
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New alteration job</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Customer (optional)</Label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <p className="text-sm font-medium">{selectedCustomer.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedCustomer.mobile}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedCustomer(null);
                    form.setValue("customerId", "");
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search name or mobile"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleFindCustomer();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleFindCustomer} disabled={isSearchingCustomer}>
                    <Search className="size-4" /> Find
                  </Button>
                </div>
                {customerResults.length > 0 && (
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full rounded-md border p-2 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          setSelectedCustomer(c);
                          form.setValue("customerId", c.id);
                          setCustomerResults([]);
                          setCustomerQuery("");
                        }}
                      >
                        {c.name} · {c.mobile}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>Item description</Label>
            <Textarea
              {...form.register("itemDescription")}
              rows={2}
              placeholder="Red silk saree, blouse piece attached"
            />
            {form.formState.errors.itemDescription && (
              <p className="text-sm text-destructive">
                {form.formState.errors.itemDescription.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Alteration details</Label>
            <Textarea
              {...form.register("alterationDetails")}
              rows={2}
              placeholder="Take in waist by 2 inches, shorten sleeves"
            />
            {form.formState.errors.alterationDetails && (
              <p className="text-sm text-destructive">
                {form.formState.errors.alterationDetails.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tailor (optional)</Label>
              <div className="flex gap-2">
                <Select
                  value={form.watch("tailorId")}
                  onValueChange={(v) => form.setValue("tailorId", v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Assign later" />
                  </SelectTrigger>
                  <SelectContent>
                    {tailors.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AddTailorDialog
                  onCreated={(t) => {
                    setTailors((prev) => [...prev, t]);
                    form.setValue("tailorId", t.id);
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Charge (₹)</Label>
              <Input type="number" step="0.01" {...form.register("charge")} />
              {form.formState.errors.charge && (
                <p className="text-sm text-destructive">{form.formState.errors.charge.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expected delivery date (optional)</Label>
            <Input type="date" {...form.register("expectedDeliveryDate")} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create alteration"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
