import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";

test.describe("Join private room", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("password gate renders for private rooms", async ({ page, request }) => {
    const res = await request.post("/api/rooms", {
      data: {
        displayName: "Gate",
        privacy: "private",
        password: "secret123",
      },
    });
    expect(res.ok()).toBeTruthy();
    const room = await res.json();

    await page.goto(`/r/${room.slug}/join`);
    await expect(page.getByRole("heading", { name: "Private room" })).toBeVisible();
    await expect(page.getByLabel("Room password")).toBeVisible();
  });
});
