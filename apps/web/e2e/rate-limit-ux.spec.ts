import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Rate limit UX", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("room create shows validation when name empty", async ({ page }) => {
    await page.goto("/");
    await page.locator("#get-started").scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "Create room" })).toBeDisabled();
  });
});
