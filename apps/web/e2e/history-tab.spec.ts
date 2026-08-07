import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { addUrlInput, createConnectedRoom, openRoomTab } from "./helpers/room";

test.describe("History tab", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("history tab shows after playback", async ({ page }) => {
    await createConnectedRoom(page, "Hist");
    await openRoomTab(page, "History");
    await expect(page.getByText(/Nothing played yet/i)).toBeVisible({
      timeout: 10000,
    });
    await openRoomTab(page, "Queue");
    await addUrlInput(page).fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await addUrlInput(page).press("Enter");
    await expect(page.getByTestId("now-playing-bar")).toBeVisible({ timeout: 20000 });
  });
});
