import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 5.1 — Democratic promote UI", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("shows promote vote bar when democratic promote is enabled", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    await hostPage.goto("/");
    await hostPage.locator("#create-name").fill("Host");
    await hostPage.getByRole("button", { name: "Create room" }).click();
    await hostPage.waitForURL(/\/r\//);
    const roomUrl = hostPage.url();
    await expect(hostPage.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    await hostPage.getByRole("button", { name: "Settings", exact: true }).click();
    await hostPage.getByRole("switch", { name: /democratic promote/i }).click();
    await hostPage.getByRole("button", { name: "Close settings" }).click();

    await guestPage.goto(roomUrl);
    await guestPage.getByLabel("Display name").fill("Guest");
    await guestPage.getByRole("button", { name: "Join room" }).click();
    await expect(guestPage.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    await guestPage.getByPlaceholder(/Paste a video\/playlist link/i).fill(videoUrl);
    await guestPage.getByPlaceholder(/Paste a video\/playlist link/i).press("Enter");
    await expect(guestPage.getByRole("status").filter({ hasText: /Added/i })).toBeVisible({
      timeout: 10000,
    });

    await expect(hostPage.getByTestId("promote-vote-bar")).toBeVisible({ timeout: 10000 });
    await expect(hostPage.getByRole("button", { name: "Vote to promote" })).toBeVisible();

    await hostContext.close();
    await guestContext.close();
  });
});
