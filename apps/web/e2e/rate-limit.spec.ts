import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 1.2 — Rate limiting API", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  const rateLimitHeaders = {
    "x-together-test-rate-limit": "1",
    "x-together-test-ip": "rate-limit-suite",
  };

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

  test("POST /api/import/youtube returns 429 after exceeding import limit", async ({ request }) => {
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
});
