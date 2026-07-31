import "server-only";
import { EventEmitter } from "node:events";
import type { KintsuEventMap, KintsuEventType } from "./types";

declare global {
  var __kintsuEventBus: EventEmitter | undefined;
}

const bus = global.__kintsuEventBus ?? new EventEmitter().setMaxListeners(50);
if (process.env.NODE_ENV !== "production") {
  global.__kintsuEventBus = bus;
}

/**
 * Fire-and-forget: emits synchronously to in-process subscribers.
 * Subscriber errors are caught and logged so a broken listener (e.g. the
 * audit logger failing to write) never fails the caller's transaction —
 * the event has already committed by the time it's emitted.
 */
export function emitEvent<T extends KintsuEventType>(
  type: T,
  payload: KintsuEventMap[T]
) {
  bus.emit(type, payload);
}

export function onEvent<T extends KintsuEventType>(
  type: T,
  handler: (payload: KintsuEventMap[T]) => void | Promise<void>
) {
  bus.on(type, (payload: KintsuEventMap[T]) => {
    Promise.resolve(handler(payload)).catch((err) => {
      console.error(`[events] Subscriber for "${type}" failed:`, err);
    });
  });
}
