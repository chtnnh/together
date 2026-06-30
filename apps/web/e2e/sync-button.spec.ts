import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 3.4 — Sync button", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("sync playback button is visible in room header", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByRole("button", { name: "Sync playback" })).toBeVisible({
      timeout: 15000,
    });
  });
});
