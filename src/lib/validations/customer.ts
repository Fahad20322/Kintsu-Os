import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .refine(
      (v) => v.replace(/\D/g, "").length >= 10,
      "Enter a valid mobile number (at least 10 digits)"
    ),
  email: z
    .union([z.literal(""), z.string().email("Enter a valid email address")])
    .optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  birthday: z.string().optional(),
  anniversary: z.string().optional(),
  preferredSize: z.string().optional(),
  notes: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const customerUpdateSchema = customerSchema.partial();
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
