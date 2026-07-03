import { z } from "zod";

export const paymentMethodValues = [
  "CASH",
  "CARD",
  "UPI",
  "GIFT_CARD",
  "STORE_CREDIT",
  "BANK_TRANSFER",
] as const;

export type PaymentMethod = (typeof paymentMethodValues)[number];

// ---------------------------------------------------------------------------
// Store details
// ---------------------------------------------------------------------------
export const storeDetailsSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  code: z.string().min(1, "Store code is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

export type StoreDetailsInput = z.output<typeof storeDetailsSchema>;
export type StoreDetailsFormValues = z.input<typeof storeDetailsSchema>;

// ---------------------------------------------------------------------------
// Tax & invoice
// ---------------------------------------------------------------------------
export const taxInvoiceSchema = z.object({
  gstin: z.string().optional(),
  defaultGstRate: z.coerce.number().min(0).max(100),
  invoicePrefix: z.string().min(1, "Invoice prefix is required"),
  invoiceNextNumber: z.coerce.number().int().min(1).optional(),
  invoiceFooterNote: z.string().optional(),
  invoiceLogoUrl: z.string().optional(),
});

export type TaxInvoiceInput = z.output<typeof taxInvoiceSchema>;
export type TaxInvoiceFormValues = z.input<typeof taxInvoiceSchema>;

// ---------------------------------------------------------------------------
// Discounts & loyalty
// ---------------------------------------------------------------------------
export const discountLoyaltySchema = z.object({
  maxDiscountPercent: z.coerce.number().min(0).max(100),
  loyaltyPointsPerRupee: z.coerce.number().min(0),
  loyaltyRedemptionValue: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().int().min(0),
});

export type DiscountLoyaltyInput = z.output<typeof discountLoyaltySchema>;
export type DiscountLoyaltyFormValues = z.input<typeof discountLoyaltySchema>;

// ---------------------------------------------------------------------------
// Barcode & printer
// ---------------------------------------------------------------------------
export const barcodePrinterSchema = z.object({
  barcodePrefix: z.string().min(1, "Barcode prefix is required"),
  barcodeSymbology: z.string().optional(),
  labelWidthMm: z.coerce.number().positive("Must be greater than 0"),
  labelHeightMm: z.coerce.number().positive("Must be greater than 0"),
  thermalPrinterWidthMm: z.coerce.number().positive("Must be greater than 0"),
  printerName: z.string().optional(),
});

export type BarcodePrinterInput = z.output<typeof barcodePrinterSchema>;
export type BarcodePrinterFormValues = z.input<typeof barcodePrinterSchema>;

// ---------------------------------------------------------------------------
// Payment methods
// ---------------------------------------------------------------------------
export const paymentMethodsSchema = z.object({
  acceptedPaymentMethods: z
    .array(z.enum(paymentMethodValues))
    .min(1, "Select at least one payment method"),
});

export type PaymentMethodsInput = z.output<typeof paymentMethodsSchema>;
export type PaymentMethodsFormValues = z.input<typeof paymentMethodsSchema>;

// ---------------------------------------------------------------------------
// Backup / restore
// ---------------------------------------------------------------------------
// Loose schema used to validate a user-supplied backup JSON file before
// applying it. Every field is optional/coerced since we only ever apply the
// fields that are present, and we never trust the file to identify which
// store/settings row to target (see restoreSettingsBackup in
// src/actions/settings.ts).
export const settingsBackupSchema = z.object({
  store: z
    .object({
      name: z.string().optional(),
      code: z.string().optional(),
      address: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      pincode: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    })
    .partial()
    .optional(),
  settings: z
    .object({
      gstin: z.string().nullable().optional(),
      defaultGstRate: z.coerce.number().min(0).max(100).optional(),
      invoicePrefix: z.string().optional(),
      invoiceNextNumber: z.coerce.number().int().min(1).optional(),
      invoiceFooterNote: z.string().nullable().optional(),
      invoiceLogoUrl: z.string().nullable().optional(),
      barcodePrefix: z.string().optional(),
      barcodeSymbology: z.string().optional(),
      labelWidthMm: z.coerce.number().positive().optional(),
      labelHeightMm: z.coerce.number().positive().optional(),
      printerName: z.string().nullable().optional(),
      thermalPrinterWidthMm: z.coerce.number().positive().optional(),
      acceptedPaymentMethods: z.array(z.enum(paymentMethodValues)).optional(),
      maxDiscountPercent: z.coerce.number().min(0).max(100).optional(),
      loyaltyPointsPerRupee: z.coerce.number().min(0).optional(),
      loyaltyRedemptionValue: z.coerce.number().min(0).optional(),
      lowStockThreshold: z.coerce.number().int().min(0).optional(),
    })
    .partial()
    .optional(),
});

export type SettingsBackupInput = z.output<typeof settingsBackupSchema>;
