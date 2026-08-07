import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { createConnectedRoom, openRoomTab } from "./helpers/room";

test.describe("Chat bidi (RTL page, LTR chat)", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("chat messages stay LTR on RTL document", async ({ page }) => {
    await page.addInitScript(() => {
      document.documentElement.setAttribute("dir", "rtl");
    });
    await createConnectedRoom(page, "Bidi");
    await openRoomTab(page, "Chat");
    const messages = page.getByTestId("chat-messages");
    await expect(messages).toHaveAttribute("dir", "ltr");
    await page.getByTestId("chat-input").fill("مرحبا hello");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByTestId("chat-message")).toContainText("hello");
  });
});
