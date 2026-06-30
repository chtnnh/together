import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 1.3 — DO ↔ Postgres settings sync", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("GET /api/rooms/[slug]/settings returns current room settings", async ({ request }) => {
    const create = await request.post("/api/rooms", {
      data: { displayName: "SettingsRead" },
    });
    expect(create.ok()).toBeTruthy();
    const { slug } = await create.json();

    const res = await request.get(`/api/rooms/${slug}/settings`);
    expect(res.ok()).toBeTruthy();
    const settings = await res.json();
    expect(settings.theme).toBeTruthy();
    expect(settings.skipThreshold).toBeGreaterThan(0);
  });

  test("PATCH /api/rooms/[slug]/settings persists merged settings", async ({ request }) => {
    const create = await request.post("/api/rooms", {
      data: { displayName: "SettingsPatch" },
    });
    const { slug } = await create.json();

    const patch = await request.patch(`/api/rooms/${slug}/settings`, {
      data: { skipThreshold: 0.75, theme: "sunset" },
    });
    expect(patch.ok()).toBeTruthy();

    const get = await request.get(`/api/rooms/${slug}/settings`);
    const settings = await get.json();
    expect(settings.skipThreshold).toBe(0.75);
    expect(settings.theme).toBe("sunset");
  });

  test("internal settings sync updates room when authorized", async ({ request }) => {
    const create = await request.post("/api/rooms", {
      data: { displayName: "InternalSync" },
    });
    const { slug } = await create.json();

    const unauthorized = await request.post(`/api/internal/rooms/${slug}/settings`, {
      data: { skipThreshold: 0.66 },
    });
    expect(unauthorized.status()).toBe(401);

    const authorized = await request.post(`/api/internal/rooms/${slug}/settings`, {
      headers: { Authorization: "Bearer test-secret" },
      data: { skipThreshold: 0.66, theme: "forest" },
    });
    expect(authorized.ok()).toBeTruthy();

    const get = await request.get(`/api/rooms/${slug}/settings`);
    const settings = await get.json();
    expect(settings.skipThreshold).toBe(0.66);
    expect(settings.theme).toBe("forest");
  });
});
