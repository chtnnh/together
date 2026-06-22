import { test, expect } from "@playwright/test";

test.describe("Together landing page", () => {
  test("shows create and join forms", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /watch & listen/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create a room" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Join a room" })).toBeVisible();
  });

  test("validates display name required", async ({ page }) => {
    await page.goto("/");
    const createButton = page.getByRole("button", { name: "Create room" });
    await expect(createButton).toBeDisabled();
  });
});

test.describe("Room flow", () => {
  test("join gate page renders for private rooms", async ({ page }) => {
    await page.goto("/r/test-room/join");
    await expect(page.getByRole("heading", { name: "Private room" })).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });
});

test.describe("Settings page", () => {
  test("shows sign in form", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
  });
});

test.describe("Playlists page", () => {
  test("prompts for authentication", async ({ page }) => {
    await page.goto("/playlists");
    await expect(page.getByRole("heading", { name: "Saved Playlists" })).toBeVisible();
  });
});
