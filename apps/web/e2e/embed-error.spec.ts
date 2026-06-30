import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import {
  embedErrorMessage,
  isEmbedBlockedError,
} from "../src/lib/playback-embed-error";

test.describe("Phase 3.2 — YouTube embed error UX", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("identifies embed-blocked error codes", () => {
    expect(isEmbedBlockedError(101)).toBe(true);
    expect(isEmbedBlockedError(150)).toBe(true);
    expect(isEmbedBlockedError(5)).toBe(false);
  });

  test("maps error codes to user-facing messages", () => {
    expect(embedErrorMessage(101)).toMatch(/can't be played/i);
    expect(embedErrorMessage(150)).toMatch(/embedded/i);
  });

  test("embed error banner is hidden until an error occurs", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByTestId("playback-embed-error")).not.toBeVisible();
  });
});
