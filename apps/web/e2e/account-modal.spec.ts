import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("v0.3 — In-room account modal", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("Account button opens settings modal without leaving room", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("ModalUser");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Account" }).click();
    await expect(page.getByRole("dialog", { name: "Account" })).toBeVisible();
    await expect(page.getByText("Theme")).toBeVisible();
    expect(page.url()).toMatch(/\/r\//);
  });
});
