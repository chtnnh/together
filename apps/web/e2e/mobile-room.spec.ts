import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { expectLeftBeforeRight, expectNoOverlap } from "./helpers/layout";
import { createConnectedRoom } from "./helpers/room";

const MOBILE_VIEWPORTS = [
  { name: "iphone-13", width: 390, height: 844 },
  { name: "pixel-5", width: 393, height: 851 },
  { name: "iphone-se", width: 375, height: 667 },
] as const;

test.describe("Mobile room UI", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  for (const viewport of MOBILE_VIEWPORTS) {
    test(`header does not overlap actions (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await createConnectedRoom(page, `Mobile ${viewport.name}`);

      const connectionStatus = page.getByTestId("connection-status");
      const syncButton = page.getByRole("button", { name: "Sync playback" });

      await expect(connectionStatus).toBeVisible();
      await expect(syncButton).toBeVisible();
      await expectLeftBeforeRight(connectionStatus, syncButton);
      await expectNoOverlap(connectionStatus, syncButton);
    });

    test(`shows bottom nav and now-playing bar (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await createConnectedRoom(page, `Mobile ${viewport.name}`);

      const mobileNav = page.locator("nav").filter({ has: page.getByText("Now", { exact: true }) });
      await expect(mobileNav).toBeVisible();
      await expect(page.getByTestId("now-playing-bar")).toBeVisible();
    });

    test(`can switch mobile tabs (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await createConnectedRoom(page, `Mobile ${viewport.name}`);

      const bottomNav = page.locator("nav").filter({ has: page.getByText("Now", { exact: true }) });
      await bottomNav.getByRole("button", { name: "Queue" }).click();
      await expect(page.getByPlaceholder(/Paste a video\/playlist link/i).first()).toBeVisible();

      await bottomNav.getByRole("button", { name: "Chat" }).click();
      await expect(page.getByPlaceholder(/Type a message/i)).toBeVisible();
    });
  }
});
