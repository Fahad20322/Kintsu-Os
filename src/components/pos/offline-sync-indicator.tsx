"use client";

import * as React from "react";
import { toast } from "sonner";
import { WifiOff, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { checkout } from "@/actions/pos";
import { listQueuedSales, syncQueuedSales } from "@/lib/offline/queue";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineSyncIndicator() {
  const isOnline = useOnlineStatus();
  const [queuedCount, setQueuedCount] = React.useState(0);
  const [syncing, setSyncing] = React.useState(false);

  const refreshCount = React.useCallback(async () => {
    const queued = await listQueuedSales();
    setQueuedCount(queued.length);
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial queued-sale count, not a render-time derivation
    refreshCount();
  }, [refreshCount]);

  React.useEffect(() => {
    if (!isOnline || syncing) return;

    async function sync() {
      const before = (await listQueuedSales()).length;
      if (before === 0) return;

      setSyncing(true);
      try {
        const { synced } = await syncQueuedSales(checkout);
        if (synced > 0) {
          toast.success(`Synced ${synced} offline sale${synced > 1 ? "s" : ""}`);
        }
      } finally {
        setSyncing(false);
        refreshCount();
      }
    }

    sync();
    // Re-run whenever we come back online.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  if (isOnline && queuedCount === 0) return null;

  return (
    <Badge variant={isOnline ? "secondary" : "destructive"} className="gap-1.5">
      {isOnline ? (
        <RefreshCw className={`size-3 ${syncing ? "animate-spin" : ""}`} />
      ) : (
        <WifiOff className="size-3" />
      )}
      {isOnline
        ? `Syncing ${queuedCount} offline sale${queuedCount === 1 ? "" : "s"}...`
        : queuedCount > 0
          ? `Offline — ${queuedCount} sale${queuedCount === 1 ? "" : "s"} queued`
          : "Offline — sales will be queued"}
    </Badge>
  );
}
