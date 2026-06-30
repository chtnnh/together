import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 2.1 — Spotify import", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("GET /api/import/spotify returns 401 when not authenticated", async ({ request }) => {
    const res = await request.get("/api/import/spotify");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/not authenticated/i);
  });

  test("POST /api/import/spotify returns 401 when not authenticated", async ({ request }) => {
    const res = await request.post("/api/import/spotify", {
      data: { playlistId: "example-playlist" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/not authenticated/i);
  });
});
