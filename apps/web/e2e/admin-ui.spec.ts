import { expect, test } from "@playwright/test";

test.describe("Admin UI smoke", () => {
  test("admin route redirects without superadmin session", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL("/");
  });
});
