import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { createConnectedRoom } from "./helpers/room";

test.describe("@smoke", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("landing page loads create and join forms", async ({ page }) => {
    await page.goto("/");
    await page.locator("#get-started").scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "Create a room" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create room" })).toBeVisible();
  });

  test("creates room and connects to realtime", async ({ page }) => {
    await createConnectedRoom(page, "Smoke");
    await expect(page.getByTestId("connection-status")).toContainText(/Connected/i);
  });

  test("adds a YouTube URL to the request queue", async ({ page }) => {
    await createConnectedRoom(page, "SmokeAdd");
    const input = page.getByPlaceholder(/Paste a video\/playlist link/i).filter({ visible: true });
    await input.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await input.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: /Added/i })).toBeVisible({
      timeout: 15000,
    });
  });
});
