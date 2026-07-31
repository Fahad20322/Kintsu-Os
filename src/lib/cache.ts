import "server-only";
import IORedis from "ioredis";

/**
 * Minimal cache/counter abstraction used for rate limiting and any future
 * cross-instance shared state. Backed by Redis (self-hosted, Valkey, or
 * Upstash — anything speaking the Redis protocol) when REDIS_URL is set;
 * falls back to an in-process Map otherwise.
 *
 * The in-memory adapter only holds state for a single app instance, so
 * rate limits reset per-instance and per-restart in that mode — fine for
 * local dev, not for a horizontally scaled production deployment. Set
 * REDIS_URL to get real shared state.
 */
interface CacheStore {
  /** Atomically increments `key` and returns the new value, setting `ttlSeconds` on first increment. */
  incrWithExpiry(key: string, ttlSeconds: number): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
}

class MemoryCacheStore implements CacheStore {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  private isExpired(entry: { expiresAt: number | null }) {
    return entry.expiresAt !== null && entry.expiresAt <= Date.now();
  }

  async incrWithExpiry(key: string, ttlSeconds: number) {
    const existing = this.store.get(key);
    if (!existing || this.isExpired(existing)) {
      this.store.set(key, { value: "1", expiresAt: Date.now() + ttlSeconds * 1000 });
      return 1;
    }
    const next = Number(existing.value) + 1;
    existing.value = String(next);
    return next;
  }

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) return null;
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }
}

class RedisCacheStore implements CacheStore {
  private client: IORedis;

  constructor(url: string) {
    this.client = new IORedis(url, { maxRetriesPerRequest: 2, lazyConnect: false });
    this.client.on("error", (err: Error) => {
      console.error("[cache] Redis connection error, requests will fail over:", err.message);
    });
  }

  async incrWithExpiry(key: string, ttlSeconds: number) {
    const value = await this.client.incr(key);
    if (value === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return value;
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, "EX", ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }
}

declare global {
  var __kintsuCache: CacheStore | undefined;
}

function createCacheStore(): CacheStore {
  const url = process.env.REDIS_URL;
  if (!url) return new MemoryCacheStore();
  try {
    return new RedisCacheStore(url);
  } catch (err) {
    console.error("[cache] Failed to initialize Redis, falling back to in-memory:", err);
    return new MemoryCacheStore();
  }
}

export const cache: CacheStore = global.__kintsuCache ?? createCacheStore();
if (process.env.NODE_ENV !== "production") {
  global.__kintsuCache = cache;
}
