import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { createConnectedRoom, mobileNav } from "./helpers/room";

test.describe("Mobile empty states", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("queue empty state on mobile nav", async ({ page }) => {
    await createConnectedRoom(page, "Empty");
    await mobileNav(page).getByRole("button", { name: "Queue", exact: true }).click();
    await expect(page.getByText(/Queue is empty/i)).toBeVisible();
  });
});
