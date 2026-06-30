import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 4.1 — Now-playing bar", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("shows now-playing bar on desktop and mobile", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    await expect(page.getByTestId("now-playing-bar")).toBeVisible();
    await expect(page.getByTestId("now-playing-bar")).toContainText("Nothing playing");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("now-playing-bar")).toBeVisible();
  });
});
