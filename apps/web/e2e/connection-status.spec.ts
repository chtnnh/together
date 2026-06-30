import { test, expect } from "@playwright/test";
import { connectionStatusLabel } from "../src/components/connection-status";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 3.3 — Connection indicator", () => {
  test("connectionStatusLabel shows Connected when online", () => {
    expect(
      connectionStatusLabel({
        offline: false,
        connected: true,
        synced: true,
        participantCount: 3,
        slug: "abc123",
      }),
    ).toMatch(/^Connected · 3 listening · abc123$/);
  });

  test("shows connection status in room header when connected", async ({ page }) => {
    resetRateLimitStoreForTests();
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByTestId("connection-status")).toContainText(/Connected/i, {
      timeout: 15000,
    });
  });
});
