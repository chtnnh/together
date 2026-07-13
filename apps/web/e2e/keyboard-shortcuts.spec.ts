import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { addUrlInput } from "./helpers/room";

test.describe("Phase 4.2 — Keyboard shortcuts", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("? opens help and / focuses add URL input", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    await page.keyboard.press("?");
    await expect(page.getByTestId("keyboard-shortcuts-help")).toBeVisible();
    await expect(page.getByText("Play / pause")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByTestId("keyboard-shortcuts-help")).toBeHidden();

    await page.keyboard.press("/");
    await expect(addUrlInput(page)).toBeFocused();
  });

  test("shortcuts are ignored when typing in an input", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    const addInput = addUrlInput(page);
    await addInput.click();
    await addInput.press("?");
    await expect(page.getByTestId("keyboard-shortcuts-help")).toBeHidden();
  });
});
