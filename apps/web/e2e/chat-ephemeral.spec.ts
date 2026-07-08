import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("v0.3 — Ephemeral chat", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("shows join notice and empty-state copy in chat tab", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("Chatter");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    await page.getByRole("tab", { name: "Chat" }).click();
    await expect(
      page.getByText(/Messages aren't saved/i),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/No messages yet. Say hi!/i)).not.toBeVisible();
  });

  test("dismisses join notice after sending a message", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("Sender");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    await page.getByRole("tab", { name: "Chat" }).click();
    await expect(page.getByText(/Messages aren't saved/i)).toBeVisible({
      timeout: 10000,
    });

    await page.getByPlaceholder("Type a message").fill("hello");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(/Messages aren't saved/i)).not.toBeVisible();
    await expect(page.getByText("hello")).toBeVisible();
  });
});
