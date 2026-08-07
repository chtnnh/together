import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import {
  addUrlInput,
  expectPromoteVoteBarVisible,
  openRoomSettings,
  promoteVoteBar,
} from "./helpers/room";

test.describe("Democratic promote full vote flow", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("guest request gets promote votes from host", async ({ browser }) => {
    test.setTimeout(60_000);
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    await hostPage.goto("/");
    await hostPage.locator("#create-name").fill("PromoteHost");
    await hostPage.getByRole("button", { name: "Create room" }).click();
    await hostPage.waitForURL(/\/r\//);
    const roomUrl = hostPage.url();
    await expect(hostPage.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    await openRoomSettings(hostPage);
    await hostPage.getByRole("switch", { name: /democratic promote/i }).click();
    await hostPage.getByRole("button", { name: "Close settings" }).click();

    await guestPage.goto(roomUrl);
    await guestPage.getByLabel("Display name").fill("PromoteGuest");
    await guestPage.getByRole("button", { name: "Join room" }).click();
    await expect(guestPage.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });
    await expect(hostPage.getByText(/2 listening/)).toBeVisible({ timeout: 15000 });

    await addUrlInput(guestPage).fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await addUrlInput(guestPage).press("Enter");
    await expect(guestPage.getByRole("status").filter({ hasText: /Added/i })).toBeVisible({
      timeout: 10000,
    });

    await expectPromoteVoteBarVisible(hostPage);
    await promoteVoteBar(hostPage).getByRole("button", { name: "Vote to promote" }).click();
    await expect(promoteVoteBar(hostPage).getByRole("button", { name: "Voted" })).toBeVisible({
      timeout: 5000,
    });

    await hostContext.close();
    await guestContext.close();
  });
});
