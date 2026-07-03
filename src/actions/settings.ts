"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { store, storeSettings } from "@/db/schema";
import { requirePermission } from "@/lib/session";
import {
  barcodePrinterSchema,
  discountLoyaltySchema,
  paymentMethodsSchema,
  settingsBackupSchema,
  storeDetailsSchema,
  taxInvoiceSchema,
} from "@/lib/validations/settings";

async function getOrCreateStoreSettings(storeId: string) {
  const [existing] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.storeId, storeId));
  if (existing) return existing;

  // Defensive fallback: onboarding always creates a storeSettings row for a
  // new store, but if one is somehow missing we create the defaults here
  // rather than letting the settings page crash.
  const [created] = await db
    .insert(storeSettings)
    .values({ storeId })
    .returning();
  return created;
}

export async function getStoreAndSettings() {
  const user = await requirePermission("settings:view");
  if (!user.storeId) throw new Error("No store associated with this account");

  const [storeRow] = await db.select().from(store).where(eq(store.id, user.storeId));
  if (!storeRow) throw new Error("Store not found");

  const settingsRow = await getOrCreateStoreSettings(user.storeId);

  return { store: storeRow, settings: settingsRow };
}

export async function updateStoreDetails(rawInput: unknown) {
  const user = await requirePermission("settings:manage");
  if (!user.storeId) throw new Error("No store associated with this account");
  const input = storeDetailsSchema.parse(rawInput);

  const [updated] = await db
    .update(store)
    .set({
      name: input.name,
      code: input.code,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      pincode: input.pincode || null,
      phone: input.phone || null,
      email: input.email || null,
    })
    .where(eq(store.id, user.storeId))
    .returning();

  revalidatePath("/settings");
  return updated;
}

export async function updateTaxInvoiceSettings(rawInput: unknown) {
  const user = await requirePermission("settings:manage");
  if (!user.storeId) throw new Error("No store associated with this account");
  const input = taxInvoiceSchema.parse(rawInput);

  const [updated] = await db
    .update(storeSettings)
    .set({
      gstin: input.gstin || null,
      defaultGstRate: String(input.defaultGstRate),
      invoicePrefix: input.invoicePrefix,
      ...(input.invoiceNextNumber !== undefined
        ? { invoiceNextNumber: String(input.invoiceNextNumber) }
        : {}),
      invoiceFooterNote: input.invoiceFooterNote || null,
      invoiceLogoUrl: input.invoiceLogoUrl || null,
    })
    .where(eq(storeSettings.storeId, user.storeId))
    .returning();

  revalidatePath("/settings");
  return updated;
}

export async function updateDiscountLoyaltySettings(rawInput: unknown) {
  const user = await requirePermission("settings:manage");
  if (!user.storeId) throw new Error("No store associated with this account");
  const input = discountLoyaltySchema.parse(rawInput);

  const [updated] = await db
    .update(storeSettings)
    .set({
      maxDiscountPercent: String(input.maxDiscountPercent),
      loyaltyPointsPerRupee: String(input.loyaltyPointsPerRupee),
      loyaltyRedemptionValue: String(input.loyaltyRedemptionValue),
      lowStockThreshold: String(input.lowStockThreshold),
    })
    .where(eq(storeSettings.storeId, user.storeId))
    .returning();

  revalidatePath("/settings");
  return updated;
}

export async function updateBarcodePrinterSettings(rawInput: unknown) {
  const user = await requirePermission("settings:manage");
  if (!user.storeId) throw new Error("No store associated with this account");
  const input = barcodePrinterSchema.parse(rawInput);

  const [updated] = await db
    .update(storeSettings)
    .set({
      barcodePrefix: input.barcodePrefix,
      barcodeSymbology: input.barcodeSymbology || "CODE128",
      labelWidthMm: String(input.labelWidthMm),
      labelHeightMm: String(input.labelHeightMm),
      thermalPrinterWidthMm: String(input.thermalPrinterWidthMm),
      printerName: input.printerName || null,
    })
    .where(eq(storeSettings.storeId, user.storeId))
    .returning();

  revalidatePath("/settings");
  return updated;
}

export async function updatePaymentMethods(rawInput: unknown) {
  const user = await requirePermission("settings:manage");
  if (!user.storeId) throw new Error("No store associated with this account");
  const input = paymentMethodsSchema.parse(rawInput);

  const [updated] = await db
    .update(storeSettings)
    .set({
      acceptedPaymentMethods: input.acceptedPaymentMethods,
    })
    .where(eq(storeSettings.storeId, user.storeId))
    .returning();

  revalidatePath("/settings");
  return updated;
}

// ---------------------------------------------------------------------------
// Backup / restore
// ---------------------------------------------------------------------------
// NOTE on scope: this is an application-level "settings snapshot" export/
// import — it only covers the `store` and `storeSettings` rows for the
// current store (store profile, tax/invoice config, discount/loyalty rules,
// barcode/printer config, payment methods). It is intentionally NOT a full
// database backup (no products, inventory, sales, customers, etc.) — that
// belongs to infra-level tooling (e.g. `pg_dump`), which is out of scope for
// an in-app server action.

export async function exportSettingsBackup() {
  const user = await requirePermission("settings:manage");
  if (!user.storeId) throw new Error("No store associated with this account");

  const [storeRow] = await db.select().from(store).where(eq(store.id, user.storeId));
  if (!storeRow) throw new Error("Store not found");
  const settingsRow = await getOrCreateStoreSettings(user.storeId);

  return {
    exportedAt: new Date().toISOString(),
    version: 1 as const,
    store: {
      name: storeRow.name,
      code: storeRow.code,
      address: storeRow.address,
      city: storeRow.city,
      state: storeRow.state,
      pincode: storeRow.pincode,
      phone: storeRow.phone,
      email: storeRow.email,
    },
    settings: {
      gstin: settingsRow.gstin,
      defaultGstRate: settingsRow.defaultGstRate,
      invoicePrefix: settingsRow.invoicePrefix,
      invoiceNextNumber: settingsRow.invoiceNextNumber,
      invoiceFooterNote: settingsRow.invoiceFooterNote,
      invoiceLogoUrl: settingsRow.invoiceLogoUrl,
      barcodePrefix: settingsRow.barcodePrefix,
      barcodeSymbology: settingsRow.barcodeSymbology,
      labelWidthMm: settingsRow.labelWidthMm,
      labelHeightMm: settingsRow.labelHeightMm,
      printerName: settingsRow.printerName,
      thermalPrinterWidthMm: settingsRow.thermalPrinterWidthMm,
      acceptedPaymentMethods: settingsRow.acceptedPaymentMethods,
      maxDiscountPercent: settingsRow.maxDiscountPercent,
      loyaltyPointsPerRupee: settingsRow.loyaltyPointsPerRupee,
      loyaltyRedemptionValue: settingsRow.loyaltyRedemptionValue,
      lowStockThreshold: settingsRow.lowStockThreshold,
    },
  };
}

export async function restoreSettingsBackup(rawInput: unknown) {
  const user = await requirePermission("settings:manage");
  // Always target the current user's existing store — the backup payload is
  // never trusted to identify (or create) a store, so any storeId-like
  // fields in the uploaded file are ignored entirely by construction (the
  // schema below has no storeId/id fields to parse in the first place).
  if (!user.storeId) throw new Error("No store associated with this account");
  const input = settingsBackupSchema.parse(rawInput);

  const [existingStore] = await db.select().from(store).where(eq(store.id, user.storeId));
  if (!existingStore) throw new Error("Store not found");
  await getOrCreateStoreSettings(user.storeId);

  if (input.store) {
    const s = input.store;
    await db
      .update(store)
      .set({
        ...(s.name !== undefined ? { name: s.name } : {}),
        ...(s.code !== undefined ? { code: s.code } : {}),
        ...(s.address !== undefined ? { address: s.address } : {}),
        ...(s.city !== undefined ? { city: s.city } : {}),
        ...(s.state !== undefined ? { state: s.state } : {}),
        ...(s.pincode !== undefined ? { pincode: s.pincode } : {}),
        ...(s.phone !== undefined ? { phone: s.phone } : {}),
        ...(s.email !== undefined ? { email: s.email } : {}),
      })
      .where(eq(store.id, user.storeId));
  }

  if (input.settings) {
    const st = input.settings;
    await db
      .update(storeSettings)
      .set({
        ...(st.gstin !== undefined ? { gstin: st.gstin } : {}),
        ...(st.defaultGstRate !== undefined
          ? { defaultGstRate: String(st.defaultGstRate) }
          : {}),
        ...(st.invoicePrefix !== undefined ? { invoicePrefix: st.invoicePrefix } : {}),
        ...(st.invoiceNextNumber !== undefined
          ? { invoiceNextNumber: String(st.invoiceNextNumber) }
          : {}),
        ...(st.invoiceFooterNote !== undefined
          ? { invoiceFooterNote: st.invoiceFooterNote }
          : {}),
        ...(st.invoiceLogoUrl !== undefined ? { invoiceLogoUrl: st.invoiceLogoUrl } : {}),
        ...(st.barcodePrefix !== undefined ? { barcodePrefix: st.barcodePrefix } : {}),
        ...(st.barcodeSymbology !== undefined
          ? { barcodeSymbology: st.barcodeSymbology }
          : {}),
        ...(st.labelWidthMm !== undefined ? { labelWidthMm: String(st.labelWidthMm) } : {}),
        ...(st.labelHeightMm !== undefined
          ? { labelHeightMm: String(st.labelHeightMm) }
          : {}),
        ...(st.printerName !== undefined ? { printerName: st.printerName } : {}),
        ...(st.thermalPrinterWidthMm !== undefined
          ? { thermalPrinterWidthMm: String(st.thermalPrinterWidthMm) }
          : {}),
        ...(st.acceptedPaymentMethods !== undefined
          ? { acceptedPaymentMethods: st.acceptedPaymentMethods }
          : {}),
        ...(st.maxDiscountPercent !== undefined
          ? { maxDiscountPercent: String(st.maxDiscountPercent) }
          : {}),
        ...(st.loyaltyPointsPerRupee !== undefined
          ? { loyaltyPointsPerRupee: String(st.loyaltyPointsPerRupee) }
          : {}),
        ...(st.loyaltyRedemptionValue !== undefined
          ? { loyaltyRedemptionValue: String(st.loyaltyRedemptionValue) }
          : {}),
        ...(st.lowStockThreshold !== undefined
          ? { lowStockThreshold: String(st.lowStockThreshold) }
          : {}),
      })
      .where(eq(storeSettings.storeId, user.storeId));
  }

  revalidatePath("/settings");
  return getStoreAndSettings();
}
