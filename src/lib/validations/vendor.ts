import { z } from "zod";

export const paymentMethodValues = [
  "CASH",
  "CARD",
  "UPI",
  "GIFT_CARD",
  "STORE_CREDIT",
  "BANK_TRANSFER",
] as const;

export const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  contactPerson: z.string().optional(),
  mobile: z.string().optional(),
  email: z
    .union([z.literal(""), z.string().email("Enter a valid email address")])
    .optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  openingBalance: z.coerce.number().min(0).default(0),
});

export type VendorInput = z.output<typeof vendorSchema>;
export type VendorFormValues = z.input<typeof vendorSchema>;

export const vendorUpdateSchema = vendorSchema.partial({
  openingBalance: true,
});
export type VendorUpdateInput = z.output<typeof vendorUpdateSchema>;

export const poItemInputSchema = z.object({
  variantId: z.string().min(1, "Select a valid product variant"),
  quantityOrdered: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0"),
  unitCost: z.coerce.number().min(0, "Unit cost cannot be negative"),
});

export const purchaseOrderSchema = z.object({
  vendorId: z.string().min(1, "Select a vendor"),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(poItemInputSchema).min(1, "Add at least one line item"),
});

export type PurchaseOrderInput = z.output<typeof purchaseOrderSchema>;
export type PurchaseOrderFormValues = z.input<typeof purchaseOrderSchema>;

export const grnItemInputSchema = z.object({
  purchaseOrderItemId: z.string().min(1),
  variantId: z.string().min(1),
  quantityReceived: z.coerce.number().int().min(0).default(0),
  damagedQuantity: z.coerce.number().int().min(0).default(0),
});

export const grnReceiveSchema = z.object({
  purchaseOrderId: z.string().min(1),
  warehouseId: z.string().min(1, "Select a warehouse"),
  notes: z.string().optional(),
  items: z.array(grnItemInputSchema).min(1, "No line items to receive"),
});

export type GrnReceiveInput = z.output<typeof grnReceiveSchema>;
export type GrnReceiveFormValues = z.input<typeof grnReceiveSchema>;

export const vendorPaymentSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  purchaseOrderId: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(paymentMethodValues),
  referenceNumber: z.string().optional(),
  note: z.string().optional(),
});

export type VendorPaymentInput = z.output<typeof vendorPaymentSchema>;
export type VendorPaymentFormValues = z.input<typeof vendorPaymentSchema>;
