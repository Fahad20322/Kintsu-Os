import { z } from "zod";

export const stockMovementTypeValues = [
  "PURCHASE_IN",
  "SALE_OUT",
  "RETURN_IN",
  "EXCHANGE_IN",
  "EXCHANGE_OUT",
  "DAMAGE_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
] as const;

export type StockMovementTypeValue = (typeof stockMovementTypeValues)[number];

/** Movement types selectable from the "Stock in" dialog (manual, non-PO stock in). */
export const stockInTypeValues = ["ADJUSTMENT_IN", "PURCHASE_IN", "RETURN_IN"] as const;

/** Movement types selectable from the "Stock out / damage" dialog. */
export const stockOutTypeValues = ["ADJUSTMENT_OUT", "DAMAGE_OUT"] as const;

export const stockMovementSchema = z.object({
  variantId: z.string().min(1, "Scan or select a product variant"),
  warehouseId: z.string().min(1, "Select a warehouse"),
  type: z.enum(stockMovementTypeValues),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  unitCost: z.coerce.number().min(0).optional(),
  reason: z.string().optional(),
});

export type StockMovementInput = z.output<typeof stockMovementSchema>;
export type StockMovementFormValues = z.input<typeof stockMovementSchema>;

export const transferStockSchema = z.object({
  variantId: z.string().min(1, "Scan or select a product variant"),
  fromWarehouseId: z.string().min(1, "Select a source warehouse"),
  toWarehouseId: z.string().min(1, "Select a destination warehouse"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
});

export type TransferStockInput = z.output<typeof transferStockSchema>;
export type TransferStockFormValues = z.input<typeof transferStockSchema>;
