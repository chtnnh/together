import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 2.2 — SoundCloud import", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("POST /api/import/soundcloud rejects empty url", async ({ request }) => {
    const res = await request.post("/api/import/soundcloud", { data: { url: "" } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/url/i);
  });

  test("POST /api/import/soundcloud rejects non-SoundCloud urls", async ({ request }) => {
    const res = await request.post("/api/import/soundcloud", {
      data: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/soundcloud/i);
  });

  test("POST /api/import/soundcloud reports missing client id", async ({ request }) => {
    const res = await request.post("/api/import/soundcloud", {
      data: { url: "https://soundcloud.com/example-artist/example-track" },
    });
    expect(res.status()).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/SOUNDCLOUD_CLIENT_ID/i);
  });

  test("SoundCloud import page renders URL form", async ({ page }) => {
    await page.goto("/import/soundcloud");
    await expect(page.getByRole("heading", { name: "Import from SoundCloud" })).toBeVisible();
    await expect(page.getByLabel("SoundCloud URL")).toBeVisible();
    await expect(page.getByRole("button", { name: "Import" })).toBeVisible();
  });
});
