import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Room creation flow", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });
  test("creates room, auto-joins with saved display name, connects to realtime", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.locator("#create-name").fill("E2E Tester");
    await page.getByRole("button", { name: "Create room" }).click();

    await page.waitForURL(/\/r\/[a-z0-9]+$/);

    // Room loaded (display name restored from localStorage after hydration)
    await expect(page.getByRole("banner").getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("heading", { name: "Join" })).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/listening|Connecting/i)).toBeVisible();

    // Realtime should connect within a few seconds
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    // Should not spam WebSocket errors once connected
    const wsErrors = consoleErrors.filter(
      (e) => e.includes("WebSocket") || e.includes("websocket"),
    );
    expect(wsErrors.length).toBeLessThan(3);
  });

  test("adds a YouTube URL to the request queue", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    await page.getByPlaceholder(/Paste a video\/playlist link/i).fill(videoUrl);
    await page.getByPlaceholder(/Paste a video\/playlist link/i).press("Enter");

    // Host adds go straight to the DJ queue (desktop sidebar)
    await page.getByRole("tab", { name: "Queue" }).click();
    await expect(
      page.locator(".hidden.md\\:flex").getByText(/Never Gonna Give You Up|YouTube Video/i),
    ).toBeVisible({ timeout: 15000 });
  });

  test("shows add bar for video and playlist URLs in room", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    await expect(page.getByPlaceholder(/Paste a video\/playlist link/i)).toBeVisible();
  });

  test("shows helpful error when searching without API key", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("DJ");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText(/\d+ listening/)).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder(/Paste a video\/playlist link/i).fill("lofi hip hop");
    await page.getByPlaceholder(/Paste a video\/playlist link/i).press("Enter");

    await expect(page.getByRole("status").filter({ hasText: /YOUTUBE_API_KEY/i })).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("YouTube import API", () => {
  test("imports a direct video URL", async ({ request }) => {
    const res = await request.post("/api/import/youtube", {
      data: { query: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });
    expect(res.ok()).toBeTruthy();
    const items = await res.json();
    expect(items[0]?.videoId).toBe("dQw4w9WgXcQ");
  });
});
