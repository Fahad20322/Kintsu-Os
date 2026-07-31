export interface StorageAdapter {
  /** Uploads `data` under `key` and returns the URL it can be read back from. */
  putObject(key: string, data: Buffer, contentType: string): Promise<{ url: string }>;
  deleteObject(key: string): Promise<void>;
}
