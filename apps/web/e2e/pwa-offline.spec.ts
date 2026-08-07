import { expect, test } from "@playwright/test";

test.describe("PWA offline page", () => {
  test("offline fallback page renders", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByRole("heading", { name: /offline|you're offline/i })).toBeVisible();
  });
});
