"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportSettingsBackup, restoreSettingsBackup } from "@/actions/settings";

export function BackupRestorePanel() {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingBackup, setPendingBackup] = React.useState<unknown>(null);
  const [pendingFileName, setPendingFileName] = React.useState("");

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const backup = await exportSettingsBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kintsu-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download backup");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setPendingBackup(parsed);
      setPendingFileName(file.name);
      setConfirmOpen(true);
    } catch {
      toast.error("Could not read that file as JSON");
    } finally {
      event.target.value = "";
    }
  }

  async function handleConfirmRestore() {
    if (!pendingBackup) return;
    setIsRestoring(true);
    try {
      await restoreSettingsBackup(pendingBackup);
      toast.success("Settings restored from backup");
      setConfirmOpen(false);
      setPendingBackup(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore backup");
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Backup</CardTitle>
          <CardDescription>
            Download a JSON snapshot of this store&apos;s settings (store profile, tax,
            invoice, discount, loyalty, barcode, printer and payment method
            configuration). This is a settings-only snapshot, not a full database
            backup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownload} disabled={isDownloading} variant="outline">
            <Download /> {isDownloading ? "Preparing..." : "Download backup"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restore</CardTitle>
          <CardDescription>
            Upload a previously downloaded settings backup file to overwrite the
            current settings for this store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="restore-file">Backup file (.json)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="restore-file"
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="max-w-sm"
            />
            <Upload className="size-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore settings from backup?</DialogTitle>
            <DialogDescription>
              This will overwrite the current store details and settings with the
              contents of &ldquo;{pendingFileName}&rdquo;. This action cannot be
              undone. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setPendingBackup(null);
              }}
              disabled={isRestoring}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmRestore} disabled={isRestoring}>
              {isRestoring ? "Restoring..." : "Overwrite settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
