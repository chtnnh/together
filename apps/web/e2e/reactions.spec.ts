import { test, expect } from "@playwright/test";
import { REACTION_EMOJIS } from "@together/shared";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Phase 4.3 — Now-playing reactions", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("exports five reaction emojis", () => {
    expect(REACTION_EMOJIS).toEqual(["🔥", "👏", "💀", "❤️", "😂"]);
  });

  test("shows reaction buttons on the now-playing bar", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    const reactions = page.getByTestId("now-playing-reactions");
    await expect(reactions).toBeVisible();
    for (const emoji of REACTION_EMOJIS) {
      await expect(reactions.getByRole("button", { name: `React ${emoji}` })).toBeVisible();
    }
  });
});
