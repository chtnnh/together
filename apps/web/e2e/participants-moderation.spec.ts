import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { createConnectedRoom } from "./helpers/room";

test.describe("Participants moderation", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("host opens participants panel", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    await createConnectedRoom(hostPage, "ModHost");
    const roomUrl = hostPage.url();
    await guestPage.goto(roomUrl);
    await guestPage.getByLabel("Display name").fill("ModGuest");
    await guestPage.getByRole("button", { name: "Join room" }).click();
    await expect(hostPage.getByText(/2 listening/)).toBeVisible({ timeout: 15000 });

    await hostPage.getByRole("button", { name: "View participants" }).click();
    await expect(hostPage.getByTestId("participants-panel")).toBeVisible();

    await hostContext.close();
    await guestContext.close();
  });
});
