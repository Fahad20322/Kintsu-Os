import { getStoreAndSettings } from "@/actions/settings";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default async function SettingsPage() {
  const { store, settings } = await getStoreAndSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure store details, tax, invoicing, discounts, hardware and backups.
        </p>
      </div>

      <SettingsTabs store={store} settings={settings} />
    </div>
  );
}
