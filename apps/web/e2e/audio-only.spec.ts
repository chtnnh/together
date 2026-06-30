import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 4.7 — Desktop audio-only hides video", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });
  test("hides YouTube player on desktop when audio-only is enabled", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.locator("#create-name").fill("Listener");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    await expect(page.locator("#youtube-player")).toBeVisible();

    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("switch", { name: /audio only/i }).click();
    await page.getByRole("button", { name: "Close settings" }).click();

    await expect(page.locator("#youtube-player")).toBeHidden();
    await expect(page.getByText("Nothing playing")).toBeVisible();
  });
});
