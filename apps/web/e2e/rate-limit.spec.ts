import { test, expect } from "@playwright/test";
import {
  checkRateLimit,
  resetRateLimitStoreForTests,
  type RateLimitRule,
} from "../src/lib/rate-limit";

const rateLimitHeaders = {
  "x-together-test-rate-limit": "1",
  "x-together-test-ip": "rate-limit-suite",
};

test.describe("Phase 1.2 — Rate limiting", () => {
  test.afterEach(() => {
    resetRateLimitStoreForTests();
  });
  test("checkRateLimit allows requests under the limit", () => {
    const rule: RateLimitRule = {
      name: `unit-${Date.now()}`,
      limit: 5,
      windowMs: 60_000,
    };
    const ip = `test-${Math.random()}`;

    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(ip, rule);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  test("checkRateLimit blocks requests over the limit", () => {
    const rule: RateLimitRule = {
      name: `unit-block-${Date.now()}`,
      limit: 2,
      windowMs: 60_000,
    };
    const ip = `test-block-${Math.random()}`;

    expect(checkRateLimit(ip, rule).allowed).toBe(true);
    expect(checkRateLimit(ip, rule).allowed).toBe(true);
    const blocked = checkRateLimit(ip, rule);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  test("POST /api/rooms returns 429 after exceeding create limit", async ({ request }) => {
    const displayBase = `Rate${Date.now()}`;
    let saw429 = false;

    for (let i = 0; i < 12; i++) {
      const res = await request.post("/api/rooms", {
        headers: rateLimitHeaders,
        data: { displayName: `${displayBase}${i}`.slice(0, 24) },
      });
      if (res.status() === 429) {
        saw429 = true;
        const body = await res.json();
        expect(body.error).toMatch(/too many requests/i);
        expect(res.headers()["retry-after"]).toBeTruthy();
        break;
      }
      expect(res.ok()).toBeTruthy();
    }

    expect(saw429).toBe(true);
  });

  test("POST /api/import/youtube returns 429 after exceeding import limit", async ({
    request,
  }) => {
    let saw429 = false;

    for (let i = 0; i < 35; i++) {
      const res = await request.post("/api/import/youtube", {
        headers: rateLimitHeaders,
        data: { query: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      });
      if (res.status() === 429) {
        saw429 = true;
        const body = await res.json();
        expect(body.error).toMatch(/too many requests/i);
        break;
      }
    }

    expect(saw429).toBe(true);
  });

  test("POST /api/import/spotify returns 429 after exceeding import limit", async ({
    request,
  }) => {
    let saw429 = false;

    for (let i = 0; i < 35; i++) {
      const res = await request.post("/api/import/spotify", {
        headers: rateLimitHeaders,
        data: { playlistId: "test-playlist" },
      });
      if (res.status() === 429) {
        saw429 = true;
        break;
      }
    }

    expect(saw429).toBe(true);
  });
});
