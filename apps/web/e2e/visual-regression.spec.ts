import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { expectLeftBeforeRight, expectNoOverlap } from "./helpers/layout";
import { createConnectedRoom } from "./helpers/room";

const MOBILE_PROJECTS = new Set(["visual-pixel-5", "visual-iphone-13"]);
const DESKTOP_PROJECTS = new Set([
  "visual-desktop-chrome",
  "visual-desktop-firefox",
  "visual-desktop-safari",
]);

test.describe("Visual regression — key screens", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("landing page", async ({ page }) => {
    await page.goto("/");
    await page.locator("#get-started").scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "Create a room" })).toBeVisible();

    await expect(page).toHaveScreenshot("landing.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
    });
  });

  test("room header and now-playing bar", async ({ page }) => {
    await createConnectedRoom(page, "Visual");

    const header = page.locator("header");
    const connectionStatus = page.getByTestId("connection-status");
    const syncButton = page.getByRole("button", { name: "Sync playback" });

    await expectLeftBeforeRight(connectionStatus, syncButton);
    await expectNoOverlap(connectionStatus, syncButton);

    await expect(header).toHaveScreenshot("room-header.png", {
      mask: [connectionStatus],
      maxDiffPixelRatio: 0.03,
    });

    await expect(page.getByTestId("now-playing-bar")).toHaveScreenshot("now-playing-bar.png", {
      maxDiffPixelRatio: 0.03,
    });
  });

  test("room mobile bottom nav", async ({ page }, testInfo) => {
    test.skip(!MOBILE_PROJECTS.has(testInfo.project.name));

    await createConnectedRoom(page, "Mobile UI");

    const mobileNav = page.locator("nav").filter({ has: page.getByText("Now", { exact: true }) });
    await expect(mobileNav).toBeVisible();

    await expect(mobileNav).toHaveScreenshot("room-mobile-nav.png", {
      maxDiffPixelRatio: 0.03,
    });
  });

  test("room mobile full viewport", async ({ page }, testInfo) => {
    test.skip(!MOBILE_PROJECTS.has(testInfo.project.name));

    await createConnectedRoom(page, "Mobile full");

    await expect(page).toHaveScreenshot("room-mobile-full.png", {
      fullPage: false,
      mask: [page.getByTestId("connection-status")],
      maxDiffPixelRatio: 0.03,
    });
  });

  test("room desktop sidebar tabs", async ({ page }, testInfo) => {
    test.skip(!DESKTOP_PROJECTS.has(testInfo.project.name));

    await createConnectedRoom(page, "Desktop UI");

    const tabs = page.locator(".hidden.w-96.md\\:flex").getByRole("tablist");
    await expect(tabs).toBeVisible();

    await expect(tabs).toHaveScreenshot("room-desktop-tabs.png", {
      maxDiffPixelRatio: 0.03,
    });
  });
});
