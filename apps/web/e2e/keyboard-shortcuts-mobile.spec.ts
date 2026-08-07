import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { createConnectedRoom, openRoomTab } from "./helpers/room";

test.describe("Keyboard shortcuts on mobile", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("typing ? in chat input does not open help modal", async ({ page }) => {
    await createConnectedRoom(page, "MobileKeys");
    await openRoomTab(page, "Chat");
    const chatInput = page.getByTestId("chat-input");
    await chatInput.click();
    await chatInput.press("?");
    await expect(page.getByTestId("keyboard-shortcuts-help")).toBeHidden();
  });
});
