import { test, expect } from "@playwright/test";

test.describe("Together landing page", () => {
  test("shows create and join forms", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /watch and listen together/i }),
    ).toBeVisible();
    await page.locator("#get-started").scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "Create a room" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Join a room" })).toBeVisible();
  });

  test("validates display name required", async ({ page }) => {
    await page.goto("/");
    await page.locator("#get-started").scrollIntoViewIfNeeded();
    const createButton = page.getByRole("button", { name: "Create room" });
    await expect(createButton).toBeDisabled();
  });
});

test.describe("Room flow", () => {
  test("join gate page renders for private rooms", async ({ page, request }) => {
    const res = await request.post("/api/rooms", {
      data: {
        displayName: "Gate Tester",
        privacy: "private",
        password: "secret",
      },
    });
    expect(res.ok()).toBeTruthy();
    const room = await res.json();

    await page.goto(`/r/${room.slug}/join`);
    await expect(page.getByRole("heading", { name: "Private room" })).toBeVisible();
    await expect(page.getByLabel("Room password")).toBeVisible();
  });
});

test.describe("Settings page", () => {
  test("shows sign in form or setup notice", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
    await expect(
      page.locator("#email").or(page.getByText(/Sign-in requires Supabase/i)),
    ).toBeVisible();
  });
});

test.describe("Legal pages", () => {
  test("privacy policy is available", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy", level: 1 })).toBeVisible();
    await expect(
      page.locator("footer").getByRole("link", { name: "Terms of Service" }),
    ).toBeVisible();
  });

  test("terms of service is available", async ({ page }) => {
    await page.goto("/tos");
    await expect(page.getByRole("heading", { name: "Terms of Service", level: 1 })).toBeVisible();
    await expect(
      page.locator("footer").getByRole("link", { name: "Privacy Policy" }),
    ).toBeVisible();
  });
});

test.describe("Playlists page", () => {
  test("prompts for authentication", async ({ page }) => {
    await page.goto("/playlists");
    await expect(page.getByRole("heading", { name: "Saved Playlists" })).toBeVisible();
  });
});
