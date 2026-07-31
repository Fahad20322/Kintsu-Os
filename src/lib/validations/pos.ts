import { z } from "zod";

export const paymentMethodValues = [
  "CASH",
  "CARD",
  "UPI",
  "GIFT_CARD",
  "STORE_CREDIT",
  "BANK_TRANSFER",
] as const;

export const cartItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().min(0),
  gstRate: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0).default(0),
});

export const paymentSplitSchema = z.object({
  method: z.enum(paymentMethodValues),
  amount: z.coerce.number().positive(),
  referenceNumber: z.string().optional(),
  giftCardCode: z.string().optional(),
});

export const checkoutSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(cartItemSchema).min(1, "Cart is empty"),
  discountAmount: z.coerce.number().min(0).default(0),
  couponCode: z.string().optional(),
  loyaltyPointsRedeemed: z.coerce.number().int().min(0).default(0),
  payments: z.array(paymentSplitSchema).min(1, "Add at least one payment"),
  notes: z.string().optional(),
  // Set by the offline POS queue (src/lib/offline/) so a retried/replayed
  // checkout can be recognized as a duplicate instead of double-billing.
  clientRequestId: z.string().optional(),
});

export type CheckoutInput = z.output<typeof checkoutSchema>;
export type CheckoutFormValues = z.input<typeof checkoutSchema>;

export const returnItemSchema = z.object({
  saleItemId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  refundMethod: z.enum(paymentMethodValues),
  reason: z.string().optional(),
});

export type ReturnInput = z.output<typeof returnItemSchema>;

export const exchangeItemSchema = z.object({
  originalSaleItemId: z.string().min(1),
  returnedQuantity: z.coerce.number().int().positive(),
  newVariantId: z.string().min(1),
  newQuantity: z.coerce.number().int().positive(),
  newUnitPrice: z.coerce.number().min(0),
  newGstRate: z.coerce.number().min(0),
});

export type ExchangeInput = z.output<typeof exchangeItemSchema>;
