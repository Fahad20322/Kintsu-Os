"use client";

import type { store, storeSettings } from "@/db/schema";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { StoreDetailsForm } from "@/components/settings/store-details-form";
import { TaxInvoiceForm } from "@/components/settings/tax-invoice-form";
import { DiscountLoyaltyForm } from "@/components/settings/discount-loyalty-form";
import { BarcodePrinterForm } from "@/components/settings/barcode-printer-form";
import { PaymentMethodsForm } from "@/components/settings/payment-methods-form";
import { BackupRestorePanel } from "@/components/settings/backup-restore-panel";
import { SecurityPanel } from "@/components/settings/security-panel";

type StoreRow = typeof store.$inferSelect;
type StoreSettingsRow = typeof storeSettings.$inferSelect;

export function SettingsTabs({
  store,
  settings,
}: {
  store: StoreRow;
  settings: StoreSettingsRow;
}) {
  return (
    <Tabs defaultValue="store-details" className="gap-6">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="store-details">Store Details</TabsTrigger>
        <TabsTrigger value="tax-invoice">Tax & Invoice</TabsTrigger>
        <TabsTrigger value="discounts-loyalty">Discounts & Loyalty</TabsTrigger>
        <TabsTrigger value="barcode-printer">Barcode & Printer</TabsTrigger>
        <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
        <TabsTrigger value="backup-restore">Backup & Restore</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
      </TabsList>

      <TabsContent value="store-details">
        <StoreDetailsForm store={store} />
      </TabsContent>
      <TabsContent value="tax-invoice">
        <TaxInvoiceForm settings={settings} />
      </TabsContent>
      <TabsContent value="discounts-loyalty">
        <DiscountLoyaltyForm settings={settings} />
      </TabsContent>
      <TabsContent value="barcode-printer">
        <BarcodePrinterForm settings={settings} />
      </TabsContent>
      <TabsContent value="payment-methods">
        <PaymentMethodsForm settings={settings} />
      </TabsContent>
      <TabsContent value="backup-restore">
        <BackupRestorePanel />
      </TabsContent>
      <TabsContent value="security">
        <SecurityPanel />
      </TabsContent>
    </Tabs>
  );
}
