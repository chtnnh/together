import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { addUrlInput } from "./helpers/room";

test.describe("Queue reorder", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("host can drag queue items when multiple tracks queued", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("Reorder");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    const urls = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=9bZkp7q19f0",
    ];
    for (const url of urls) {
      await addUrlInput(page).fill(url);
      await addUrlInput(page).press("Enter");
      await expect(page.getByRole("status").filter({ hasText: /Added/i })).toBeVisible({
        timeout: 10000,
      });
    }

    await expect(page.getByTestId("queue-list").locator("[data-queue-item-id]")).toHaveCount(2, {
      timeout: 15000,
    });
  });
});
