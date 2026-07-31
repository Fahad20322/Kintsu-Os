"use server";

import { requirePermission } from "@/lib/session";
import { storage } from "@/lib/storage";
import { createId } from "@/lib/id";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Uploads a product image to cloud file storage (S3/R2, or local disk in
 * dev — see src/lib/storage/). Returns the URL to store in
 * product.images.
 */
export async function uploadProductImage(formData: FormData) {
  const user = await requirePermission("products:manage");
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, WebP or GIF images are allowed");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Image must be 5MB or smaller");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop() || "jpg";
  const key = `products/${user.storeId ?? "shared"}/${createId()}.${extension}`;

  const { url } = await storage.putObject(key, buffer, file.type);
  return { url };
}
