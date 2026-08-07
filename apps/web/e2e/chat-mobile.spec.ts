import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { createConnectedRoom, openRoomTab } from "./helpers/room";

test.describe("Chat on mobile", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("mobile nav opens chat tab with input", async ({ page }) => {
    await createConnectedRoom(page, "MobileChat");
    await openRoomTab(page, "Chat");
    await expect(page.getByTestId("chat-input")).toBeVisible();
    await expect(page.getByTestId("chat-messages")).toBeVisible();
  });
});
