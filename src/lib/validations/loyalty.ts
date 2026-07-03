import { z } from "zod";

export const loyaltyTierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  minSpend: z.coerce.number().min(0, "Minimum spend cannot be negative"),
  pointsMultiplier: z.coerce
    .number()
    .positive("Points multiplier must be greater than 0")
    .default(1),
  benefits: z.string().optional(),
});

export type LoyaltyTierInput = z.output<typeof loyaltyTierSchema>;
export type LoyaltyTierFormValues = z.input<typeof loyaltyTierSchema>;

export const adjustLoyaltyPointsSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  points: z.coerce
    .number()
    .int("Points must be a whole number")
    .refine((v) => v !== 0, "Points adjustment cannot be zero"),
  note: z.string().optional(),
});

export type AdjustLoyaltyPointsInput = z.output<typeof adjustLoyaltyPointsSchema>;
export type AdjustLoyaltyPointsFormValues = z.input<typeof adjustLoyaltyPointsSchema>;
