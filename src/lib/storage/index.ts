import "server-only";
import { LocalDiskAdapter } from "./adapters/local-adapter";
import { S3StorageAdapter } from "./adapters/s3-adapter";
import type { StorageAdapter } from "./types";

declare global {
  var __kintsuStorage: StorageAdapter | undefined;
}

function createStorage(): StorageAdapter {
  if (process.env.S3_BUCKET) {
    try {
      return new S3StorageAdapter();
    } catch (err) {
      console.error("[storage] Failed to initialize S3 adapter, falling back to local disk:", err);
    }
  } else {
    console.log("[storage] S3_BUCKET not set — using local disk adapter (public/uploads)");
  }
  return new LocalDiskAdapter();
}

export const storage: StorageAdapter = global.__kintsuStorage ?? createStorage();
if (process.env.NODE_ENV !== "production") {
  global.__kintsuStorage = storage;
}

export type { StorageAdapter } from "./types";
