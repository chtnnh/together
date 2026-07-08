import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("v0.3 — Public playlist import", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("GET /api/import/services returns availability flags", async ({ request }) => {
    const res = await request.get("/api/import/services");
    expect(res.ok()).toBeTruthy();
    const data = (await res.json()) as {
      spotify?: boolean;
      soundcloud?: boolean;
      apple?: boolean;
    };
    expect(typeof data.spotify).toBe("boolean");
    expect(typeof data.soundcloud).toBe("boolean");
    expect(typeof data.apple).toBe("boolean");
  });

  test("POST /api/import/spotify with invalid URL rejects request", async ({ request }) => {
    const res = await request.post("/api/import/spotify", {
      data: { url: "https://example.com/not-spotify" },
    });
    expect([400, 503]).toContain(res.status());
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

  test("Add bar accepts playlist URLs in room", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("Importer");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    await expect(page.getByPlaceholder(/Paste a video\/playlist link/i)).toBeVisible();
  });
});
