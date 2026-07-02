"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createVendor } from "@/actions/vendors";
import {
  vendorSchema,
  type VendorInput,
  type VendorFormValues,
} from "@/lib/validations/vendor";

export function AddVendorDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<VendorFormValues, unknown, VendorInput>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      mobile: "",
      email: "",
      address: "",
      gstin: "",
      openingBalance: 0,
    },
  });

  async function onSubmit(values: VendorInput) {
    setIsSubmitting(true);
    try {
      const created = await createVendor(values);
      toast.success("Vendor added");
      setOpen(false);
      form.reset();
      router.push(`/vendors/${created.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add vendor");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Add vendor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add vendor</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-2">
            <Label>Vendor name</Label>
            <Input {...form.register("name")} placeholder="Shree Textiles" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Contact person</Label>
              <Input {...form.register("contactPerson")} placeholder="Ramesh Gupta" />
            </div>
            <div className="space-y-2">
              <Label>Mobile</Label>
              <Input {...form.register("mobile")} placeholder="9876543210" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input {...form.register("email")} placeholder="vendor@example.com" />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input {...form.register("address")} placeholder="Shop #, City" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input {...form.register("gstin")} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="space-y-2">
              <Label>Opening balance (₹)</Label>
              <Input type="number" step="0.01" {...form.register("openingBalance")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Add vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
