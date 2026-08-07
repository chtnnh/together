import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { createConnectedRoom, openRoomSettings } from "./helpers/room";

test.describe("Settings in room", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("host opens settings drawer", async ({ page }) => {
    await createConnectedRoom(page, "Settings");
    await openRoomSettings(page);
    await expect(page.getByTestId("settings-drawer")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
