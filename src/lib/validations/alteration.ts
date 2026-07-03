import { z } from "zod";

export const tailorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z.string().optional(),
  specialization: z.string().optional(),
});

export type TailorInput = z.infer<typeof tailorSchema>;

export const alterationStatusValues = [
  "RECEIVED",
  "ASSIGNED",
  "IN_PROGRESS",
  "READY",
  "DELIVERED",
] as const;

export const alterationSchema = z.object({
  customerId: z.string().optional(),
  itemDescription: z.string().min(1, "Item description is required"),
  alterationDetails: z.string().min(1, "Alteration details are required"),
  tailorId: z.string().optional(),
  charge: z.coerce.number().min(0, "Charge cannot be negative").default(0),
  expectedDeliveryDate: z.string().optional(),
});

export type AlterationInput = z.output<typeof alterationSchema>;
export type AlterationFormValues = z.input<typeof alterationSchema>;

export const updateAlterationStatusSchema = z.object({
  status: z.enum(alterationStatusValues),
  note: z.string().optional(),
  tailorId: z.string().optional(),
});

export type UpdateAlterationStatusInput = z.infer<typeof updateAlterationStatusSchema>;
