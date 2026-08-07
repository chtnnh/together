import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { addUrlInput, createConnectedRoom } from "./helpers/room";

test.describe("Playback two clients", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("second client joins same room and sees connection status", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    await createConnectedRoom(hostPage, "Host2");
    const roomUrl = hostPage.url();

    await guestPage.goto(roomUrl);
    await guestPage.getByLabel("Display name").fill("Guest2");
    await guestPage.getByRole("button", { name: "Join room" }).click();
    await expect(guestPage.getByTestId("connection-status")).toContainText(/Connected/i, {
      timeout: 15000,
    });
    await expect(hostPage.getByText(/2 listening/)).toBeVisible({ timeout: 15000 });

    await hostContext.close();
    await guestContext.close();
  });

  test("host adds track visible in queue area", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await createConnectedRoom(page, "Sync");
    await addUrlInput(page).fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await addUrlInput(page).press("Enter");
    await expect(page.getByTestId("now-playing-bar")).toBeVisible({ timeout: 15000 });
    await context.close();
  });
});
