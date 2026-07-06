import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 2.1 — Spotify import", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("GET /api/import/spotify returns 404 when OAuth is disabled", async ({ request }) => {
    const res = await request.get("/api/import/spotify");
    expect(res.status()).toBe(404);
  });

  test("POST /api/import/spotify without URL returns 400 when OAuth disabled", async ({
    request,
  }) => {
    const res = await request.post("/api/import/spotify", {
      data: { playlistId: "example-playlist" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/public Spotify playlist URL/i);
  });
});
