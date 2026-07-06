import { test, expect } from "@playwright/test";

test.describe("v0.3 — Internal room snapshot API", () => {
  test("POST /api/internal/rooms/[slug]/snapshot returns 401 without token", async ({
    request,
  }) => {
    const res = await request.post("/api/internal/rooms/test-room/snapshot", {
      data: {
        playback: {
          videoId: null,
          positionMs: 0,
          playing: false,
          playbackRate: 1,
          version: 0,
          updatedAt: Date.now(),
          queueItemId: null,
        },
        queue: [],
        requests: [],
        updatedAt: Date.now(),
      },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/internal/rooms/[slug]/bans returns 401 without token", async ({ request }) => {
    const res = await request.get("/api/internal/rooms/test-room/bans");
    expect(res.status()).toBe(401);
  });

  test("POST /api/internal/rooms/[slug]/bans returns 401 without token", async ({
    request,
  }) => {
    const res = await request.post("/api/internal/rooms/test-room/bans", {
      data: { anonId: "anon-1" },
    });
    expect(res.status()).toBe(401);
  });
});
