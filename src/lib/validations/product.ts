import { z } from "zod";

export const genderValues = ["MEN", "WOMEN", "KIDS", "UNISEX"] as const;

export const variantInputSchema = z.object({
  id: z.string().optional(),
  size: z.string().min(1, "Size is required"),
  color: z.string().min(1, "Color is required"),
  sku: z.string().optional().default(""),
  barcode: z.string().optional().default(""),
  openingQuantity: z.coerce.number().int().min(0).default(0),
});

export type VariantInput = z.infer<typeof variantInputSchema>;

export const productSchema = z.object({
  articleCode: z.string().min(1, "Article code is required"),
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),

  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  brandId: z.string().optional(),
  collectionId: z.string().optional(),

  season: z.string().optional(),
  fabric: z.string().optional(),
  pattern: z.string().optional(),
  sleeveType: z.string().optional(),
  neckType: z.string().optional(),
  gender: z.enum(genderValues).default("WOMEN"),
  occasion: z.string().optional(),

  mrp: z.coerce.number().positive("MRP must be greater than 0"),
  sellingPrice: z.coerce.number().positive("Selling price must be greater than 0"),
  purchaseCost: z.coerce.number().min(0, "Purchase cost cannot be negative"),
  gstRate: z.coerce.number().min(0).max(100).default(5),

  images: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),

  variants: z.array(variantInputSchema).min(1, "Add at least one size/color variant"),
});

export type ProductInput = z.output<typeof productSchema>;
export type ProductFormValues = z.input<typeof productSchema>;

export const taxonomySchema = z.object({
  name: z.string().min(1, "Name is required"),
});
