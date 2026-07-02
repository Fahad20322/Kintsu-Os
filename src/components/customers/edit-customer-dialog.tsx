"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

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
import { updateCustomer } from "@/actions/customers";

type EditableCustomer = {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  city: string | null;
  birthday: string | null;
  anniversary: string | null;
  preferredSize: string | null;
  notes: string | null;
};

function toFormValues(customer: EditableCustomer): CustomerInput {
  return {
    name: customer.name,
    mobile: customer.mobile,
    email: customer.email ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    birthday: customer.birthday ?? "",
    anniversary: customer.anniversary ?? "",
    preferredSize: customer.preferredSize ?? "",
    notes: customer.notes ?? "",
  };
}

export function EditCustomerDialog({ customer }: { customer: EditableCustomer }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: toFormValues(customer),
  });

  async function onSubmit(values: CustomerInput) {
    setIsSubmitting(true);
    try {
      await updateCustomer(customer.id, values);
      toast.success("Customer updated");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update customer");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) form.reset(toFormValues(customer));
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit customer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <CustomerFormFields control={form.control} />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
