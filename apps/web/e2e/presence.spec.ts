import { test, expect } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("v0.3 — Live participant count", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("shows 1 listening for a solo participant", async ({ page }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("Solo");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);
    await expect(page.getByText("1 listening")).toBeVisible({ timeout: 15000 });
  });

  test("DO /stats returns 0 after the only participant leaves", async ({ page, request }) => {
    await page.goto("/");
    await page.locator("#create-name").fill("Leaver");
    await page.getByRole("button", { name: "Create room" }).click();
    await page.waitForURL(/\/r\//);

    const roomUrl = page.url();
    const roomId = roomUrl.split("/r/")[1]?.split(/[?#]/)[0];
    expect(roomId).toBeTruthy();

    await expect(page.getByText("1 listening")).toBeVisible({ timeout: 15000 });

    await page.close();

    await expect
      .poll(
        async () => {
          const res = await request.get(`http://127.0.0.1:8787/room/${roomId}/stats`);
          if (!res.ok()) return -1;
          const data = (await res.json()) as { participantCount?: number };
          return data.participantCount ?? -1;
        },
        { timeout: 10000 },
      )
      .toBe(0);
  });
});
