import { NextResponse } from "next/server";

interface Counter {
  count: number;
  resetAt: number;
}

const store =
  (globalThis as typeof globalThis & { __togetherRateLimit?: Map<string, Counter> })
    .__togetherRateLimit ?? new Map<string, Counter>();
(
  globalThis as typeof globalThis & { __togetherRateLimit?: Map<string, Counter> }
).__togetherRateLimit = store;

export interface RateLimitRule {
  /** Logical bucket name, keeps different routes from sharing counters. */
  name: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets (for Retry-After). */
  retryAfterSeconds: number;
}

/** Best-effort client IP from common proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Fixed-window, in-memory rate limiter. Suitable for single-instance dev and
 * best-effort protection on serverless (per-instance). Swap for a shared store
 * (Redis/Upstash) if strict global limits are needed.
 */
export function checkRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  const storeKey = `${rule.name}:${key}`;
  const existing = store.get(storeKey);

  if (!existing || existing.resetAt <= now) {
    store.set(storeKey, { count: 1, resetAt: now + rule.windowMs });
    return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= rule.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: rule.limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Enforce a rate limit for an incoming request. Returns a 429 `NextResponse`
 * when the limit is exceeded, or `null` when the request may proceed.
 */
export function enforceRateLimit(request: Request, rule: RateLimitRule): NextResponse | null {
  const result = checkRateLimit(getClientIp(request), rule);
  if (result.allowed) return null;

  return NextResponse.json(
    {
      error: `Too many requests. Try again in ${result.retryAfterSeconds}s.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
