import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { addUrlInput } from "./helpers/room";

test.describe("Phase 3.1 — Queue add toasts", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });
  test("shows success toast when adding a YouTube URL", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    await addUrlInput(page).fill(videoUrl);
    await addUrlInput(page).press("Enter");

    await expect(page.getByRole("status").filter({ hasText: /Added "/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("shows error toast when import fails", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    await addUrlInput(page).fill("lofi hip hop");
    await addUrlInput(page).press("Enter");

    await expect(
      page.getByRole("status").filter({ hasText: /YOUTUBE_API_KEY/i }),
    ).toBeVisible({ timeout: 5000 });
  });
});
