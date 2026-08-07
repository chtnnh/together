import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { createConnectedRoom, openRoomTab } from "./helpers/room";

test.describe("Chat @mentions", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("highlights mention when sending @displayName", async ({ page }) => {
    await createConnectedRoom(page, "MentionHost");
    await openRoomTab(page, "Chat");
    await page.getByTestId("chat-input").fill("@MentionHost hello");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByTestId("chat-message")).toContainText("hello");
    await expect(page.getByTestId("chat-message")).toContainText("@MentionHost");
  });
});
