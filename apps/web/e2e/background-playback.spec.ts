import { test, expect } from "@playwright/test";
import {
  shouldAttemptBackgroundResume,
  shouldResyncOnForeground,
} from "../src/lib/playback-visibility";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 4.6 — Background playback", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });
  test("attempts background resume only when hidden and room is playing", () => {
    expect(shouldAttemptBackgroundResume(true, true)).toBe(true);
    expect(shouldAttemptBackgroundResume(true, false)).toBe(false);
    expect(shouldAttemptBackgroundResume(false, true)).toBe(false);
  });

  test("resyncs when the tab returns to the foreground", () => {
    expect(shouldResyncOnForeground(false)).toBe(true);
    expect(shouldResyncOnForeground(true)).toBe(false);
  });

  test("room stays connected after visibility changes", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("Mobile");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await expect(page.getByText(/\d+ listening/)).toBeVisible();
  });
});
