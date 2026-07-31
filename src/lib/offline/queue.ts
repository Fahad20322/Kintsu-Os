"use client";

import { idbDelete, idbGetAll, idbPut } from "./db";
import type { CheckoutInput } from "@/lib/validations/pos";

export type QueuedSale = CheckoutInput & {
  clientRequestId: string;
  queuedAt: string;
};

/**
 * Offline POS billing: if a checkout can't reach the server (no
 * connectivity, or the request fails outright), the cart is saved here
 * instead of being lost. Each entry carries a client-generated
 * clientRequestId so replaying it later can't double-bill — see the
 * dedupe check in src/actions/pos.ts's checkout().
 */
export async function queueSale(input: CheckoutInput): Promise<QueuedSale> {
  const record: QueuedSale = {
    ...input,
    clientRequestId: input.clientRequestId || crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
  };
  await idbPut(record);
  return record;
}

export function listQueuedSales(): Promise<QueuedSale[]> {
  return idbGetAll<QueuedSale>();
}

export function removeQueuedSale(clientRequestId: string) {
  return idbDelete(clientRequestId);
}

/**
 * Replays every queued sale through `checkoutFn` (the real `checkout`
 * server action) in order, removing each on success. Stops at the first
 * failure so sales stay queued (and in order) rather than being dropped
 * silently on a still-flaky connection.
 */
export async function syncQueuedSales(
  checkoutFn: (input: CheckoutInput) => Promise<{ id: string }>
): Promise<{ synced: number; remaining: number }> {
  const queued = await listQueuedSales();
  let synced = 0;
  for (const sale of queued.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))) {
    try {
      const { clientRequestId: _clientRequestId, queuedAt: _queuedAt, ...input } = sale;
      await checkoutFn({ ...input, clientRequestId: sale.clientRequestId });
      await removeQueuedSale(sale.clientRequestId);
      synced++;
    } catch {
      break;
    }
  }
  const remaining = (await listQueuedSales()).length;
  return { synced, remaining };
}
