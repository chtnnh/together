import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { roomSidebar } from "./helpers/room";

test.describe("Phase 3.5 — Empty states", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("shows CTA copy on empty queue and requests tabs", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    const sidebar = roomSidebar(page);
    await expect(
      sidebar.getByText("Paste a video or playlist link above to request a track."),
    ).toBeVisible();

    await sidebar.getByRole("tab", { name: "Queue" }).click();
    await expect(
      sidebar.getByText("Paste a video or playlist link above to add tracks."),
    ).toBeVisible();

    await sidebar.getByRole("tab", { name: "History" }).click();
    await expect(
      sidebar.getByText("Tracks appear here after they play or get skipped."),
    ).toBeVisible();
  });
});
