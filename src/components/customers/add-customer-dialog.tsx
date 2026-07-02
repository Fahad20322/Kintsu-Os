"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { CustomerFormFields } from "@/components/customers/customer-form-fields";
import { customerSchema, type CustomerInput } from "@/lib/validations/customer";
import { createCustomer } from "@/actions/customers";

const defaultValues: CustomerInput = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  city: "",
  birthday: "",
  anniversary: "",
  preferredSize: "",
  notes: "",
};

export function AddCustomerDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  async function onSubmit(values: CustomerInput) {
    setIsSubmitting(true);
    try {
      await createCustomer(values);
      toast.success("Customer added");
      setOpen(false);
      form.reset(defaultValues);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add customer");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(defaultValues);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus /> Add customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <CustomerFormFields control={form.control} />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add customer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
