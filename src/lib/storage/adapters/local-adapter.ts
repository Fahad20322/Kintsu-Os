import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { StorageAdapter } from "../types";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * Dev/single-instance fallback: writes straight to the container's local
 * disk under public/uploads, served by Next.js like any other static
 * asset. Fine for local development or a single-instance deployment with
 * a persistent volume; on ephemeral/serverless/multi-instance deployments
 * (Vercel, autoscaled containers) files won't survive a redeploy or be
 * visible across instances — set S3_BUCKET to use real object storage.
 */
export class LocalDiskAdapter implements StorageAdapter {
  async putObject(key: string, data: Buffer, _contentType: string) {
    const filePath = path.join(UPLOAD_DIR, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return { url: `/uploads/${key}` };
  }

  async deleteObject(key: string) {
    const filePath = path.join(UPLOAD_DIR, key);
    await unlink(filePath).catch(() => {});
  }
}
