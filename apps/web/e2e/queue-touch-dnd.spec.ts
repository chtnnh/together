import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 5.2 — Touch queue reorder", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("queue drag handle uses touch-none for pointer reorder", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.locator("#create-name").fill("Host");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    for (let i = 0; i < 2; i += 1) {
      await page.getByPlaceholder("YouTube URL or search...").fill(
        `https://www.youtube.com/watch?v=dQw4w9WgXcQ&test=${i}`,
      );
      await page.getByPlaceholder("YouTube URL or search...").press("Enter");
      await expect(page.getByRole("status").filter({ hasText: /Added/i })).toBeVisible({
        timeout: 10000,
      });
    }

    await page.getByRole("tab", { name: "Queue" }).click();
    await expect(page.locator("[data-queue-item-id]").first()).toBeVisible({ timeout: 5000 });
    const grip = page.locator("[data-queue-item-id] .touch-none").first();
    await expect(grip).toBeVisible();
  });
});
