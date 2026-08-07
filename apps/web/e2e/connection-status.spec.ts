import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 3.3 — Connection indicator", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("shows connection status in room header when connected", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByTestId("connection-status")).toContainText(/Connected/i, {
      timeout: 15000,
    });
  });
});
