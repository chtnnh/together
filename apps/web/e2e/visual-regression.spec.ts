import { test, expect } from "@playwright/test";
import { expectLeftBeforeRight, expectNoOverlap } from "./helpers/layout";
import { createConnectedRoom, waitForRoomUiStable, connectionStatusLocator } from "./helpers/room";

const MOBILE_PROJECTS = new Set(["visual-pixel-5", "visual-iphone-13"]);
const DESKTOP_PROJECTS = new Set([
  "visual-desktop-chrome",
  "visual-desktop-firefox",
  "visual-desktop-safari",
]);

const screenshotOptions = { maxDiffPixelRatio: 0.03 };

test.describe("Visual regression — key screens", () => {
  test("landing page", async ({ page }) => {
    await page.goto("/");
    const getStarted = page.locator("#get-started");
    await getStarted.scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "Create a room" })).toBeVisible();

    // Hero/forms only — full-page captures vary too much across OS font rendering.
    await expect(getStarted).toHaveScreenshot("landing-get-started.png", screenshotOptions);
  });

  test("room header and now-playing bar", async ({ page }, testInfo) => {
    await createConnectedRoom(page, "Visual");
    await waitForRoomUiStable(page);

    const header = page.locator("header");
    const connectionStatus = connectionStatusLocator(page);
    const syncButton = page.getByRole("button", { name: "Sync playback" });

    const isDesktop = DESKTOP_PROJECTS.has(testInfo.project.name);
    if (isDesktop) {
      await expectLeftBeforeRight(connectionStatus, syncButton);
      await expectNoOverlap(connectionStatus, syncButton);
    } else {
      const title = header.locator("h1:visible");
      const titleBox = await title.boundingBox();
      expect(titleBox?.width ?? 0).toBeGreaterThan(180);
      const participants = page.getByRole("button", { name: "View participants" });
      await expectLeftBeforeRight(connectionStatus, participants);
      await expectNoOverlap(connectionStatus, participants);
    }

    await expect(header).toHaveScreenshot("room-header.png", {
      ...screenshotOptions,
      mask: [connectionStatus, page.locator("header h1:visible")],
    });

    await expect(page.getByTestId("now-playing-bar")).toHaveScreenshot(
      "now-playing-bar.png",
      screenshotOptions,
    );
  });

  test("room mobile bottom nav", async ({ page }, testInfo) => {
    test.skip(!MOBILE_PROJECTS.has(testInfo.project.name));

    await createConnectedRoom(page, "Mobile UI");
    await waitForRoomUiStable(page);

    const mobileNav = page.locator("nav").filter({ has: page.getByText("Now", { exact: true }) });
    await expect(mobileNav).toBeVisible();

    await expect(mobileNav).toHaveScreenshot("room-mobile-nav.png", screenshotOptions);
  });

  test("room mobile full viewport", async ({ page }, testInfo) => {
    test.skip(!MOBILE_PROJECTS.has(testInfo.project.name));

    await createConnectedRoom(page, "Mobile full");
    await waitForRoomUiStable(page);

    await expect(page).toHaveScreenshot("room-mobile-full.png", {
      fullPage: false,
      ...screenshotOptions,
      mask: [
        connectionStatusLocator(page),
        page.locator("header h1:visible"),
        page.locator('[role="status"]'),
      ],
    });
  });

  test("room desktop sidebar tabs", async ({ page }, testInfo) => {
    test.skip(!DESKTOP_PROJECTS.has(testInfo.project.name));

    await createConnectedRoom(page, "Desktop UI");
    await waitForRoomUiStable(page);

    const tabs = page.locator(".hidden.w-96.md\\:flex").getByRole("tablist");
    await expect(tabs).toBeVisible();

    await expect(tabs).toHaveScreenshot("room-desktop-tabs.png", screenshotOptions);
  });
});
