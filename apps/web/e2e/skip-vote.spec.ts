import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { createConnectedRoom } from "./helpers/room";

test.describe("Skip vote bar", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("skip vote bar appears when track is playing", async ({ page }) => {
    await createConnectedRoom(page, "Skip");
    const input = page.getByPlaceholder(/Paste a video\/playlist link/i).filter({ visible: true });
    await input.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await input.press("Enter");
    await expect(page.getByTestId("skip-vote-bar")).toBeVisible({ timeout: 20000 });
  });
});
