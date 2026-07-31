import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { StorageAdapter } from "../types";

/**
 * Works with both AWS S3 and Cloudflare R2 (R2's API is S3-compatible —
 * point S3_ENDPOINT at the R2 account endpoint). Also fine for MinIO/other
 * S3-compatible stores.
 */
export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;
  private publicUrlBase: string;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error("S3_BUCKET is not set");
    this.bucket = bucket;

    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials:
        process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });

    this.publicUrlBase =
      process.env.S3_PUBLIC_URL ||
      (process.env.S3_ENDPOINT
        ? `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${bucket}`
        : `https://${bucket}.s3.amazonaws.com`);
  }

  async putObject(key: string, data: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      })
    );
    return { url: `${this.publicUrlBase.replace(/\/$/, "")}/${key}` };
  }

  async deleteObject(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
