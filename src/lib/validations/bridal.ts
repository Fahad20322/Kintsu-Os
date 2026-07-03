import { z } from "zod";

export const bridalOutfitStatusValues = [
  "SELECTION",
  "MEASUREMENT",
  "STITCHING",
  "EMBROIDERY",
  "TRIAL",
  "READY",
  "DELIVERED",
] as const;

export const measurementsSchema = z.object({
  bust: z.string().optional(),
  waist: z.string().optional(),
  hips: z.string().optional(),
  shoulder: z.string().optional(),
  sleeveLength: z.string().optional(),
  blouseLength: z.string().optional(),
});

export type MeasurementsInput = z.infer<typeof measurementsSchema>;

export const bridalOrderSchema = z.object({
  customerId: z.string().optional(),

  brideName: z.string().min(1, "Bride's name is required"),
  brideMobile: z.string().optional(),
  groomName: z.string().optional(),
  groomMobile: z.string().optional(),
  weddingDate: z.string().min(1, "Wedding date is required"),

  outfitDescription: z.string().min(1, "Outfit description is required"),
  fabric: z.string().optional(),
  embroideryDetails: z.string().optional(),

  measurements: measurementsSchema.default({}),

  tailorId: z.string().optional(),

  totalAmount: z.coerce.number().positive("Total amount must be greater than 0"),
  advancePaid: z.coerce.number().min(0, "Advance cannot be negative").default(0),

  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
});

export type BridalOrderInput = z.output<typeof bridalOrderSchema>;
export type BridalOrderFormValues = z.input<typeof bridalOrderSchema>;

export const bridalTrialSchema = z.object({
  trialDate: z.string().min(1, "Trial date is required"),
  outcome: z.string().optional(),
});

export type BridalTrialInput = z.output<typeof bridalTrialSchema>;
export type BridalTrialFormValues = z.input<typeof bridalTrialSchema>;

export const bridalPaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.string().min(1, "Payment method is required"),
  note: z.string().optional(),
});

export type BridalPaymentInput = z.output<typeof bridalPaymentSchema>;
export type BridalPaymentFormValues = z.input<typeof bridalPaymentSchema>;
