import "server-only";
import { cache } from "@/lib/cache";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window rate limiter keyed by caller-supplied `key` (typically
 * `${route}:${ip}`). Backed by `cache` — shared across instances when
 * REDIS_URL is set, per-instance otherwise (see src/lib/cache.ts).
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const count = await cache.incrWithExpiry(`ratelimit:${key}`, windowSeconds);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    limit,
    retryAfterSeconds: windowSeconds,
  };
}
