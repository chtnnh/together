import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { expectLeftBeforeRight, expectNoOverlap } from "./helpers/layout";
import { createConnectedRoom, connectionStatusLocator, addUrlInput } from "./helpers/room";

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
    test(`header gives room title space (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await createConnectedRoom(page, `Mobile ${viewport.name}`);

      const title = page.locator("header h1");
      await expect(title).toBeVisible();
      const titleBox = await title.boundingBox();
      expect(titleBox?.width ?? 0).toBeGreaterThan(viewport.width * 0.45);

      const connectionStatus = connectionStatusLocator(page);
      const participants = page.getByRole("button", { name: "View participants" });
      await expect(connectionStatus).toBeVisible();
      await expect(participants).toBeVisible();
      await expectLeftBeforeRight(connectionStatus, participants);
      await expectNoOverlap(connectionStatus, participants);
    });

    test(`shows bottom nav and now-playing bar (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await createConnectedRoom(page, `Mobile ${viewport.name}`);

      const mobileNav = page.locator("nav").filter({ has: page.getByText("Queue", { exact: true }) });
      await expect(mobileNav).toBeVisible();
      await expect(page.getByTestId("now-playing-bar")).toBeVisible();
    });

    test(`can switch mobile tabs (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await createConnectedRoom(page, `Mobile ${viewport.name}`);

      const bottomNav = page.locator("nav").filter({ has: page.getByText("Queue", { exact: true }) });
      await bottomNav.getByRole("button", { name: "Requests" }).click();
      await expect(addUrlInput(page)).toBeVisible();

      await bottomNav.getByRole("button", { name: "Chat" }).click();
      await expect(page.getByPlaceholder(/Type a message/i)).toBeVisible();
    });
  }
});
