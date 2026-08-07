import { expect, test } from "@playwright/test";
import { resetRateLimitStoreForTests } from "../src/lib/rate-limit";
import { createConnectedRoom, mobileNav } from "./helpers/room";

test.describe("Mobile queue", () => {
  test.beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  test("mobile nav switches queue tab", async ({ page }) => {
    await createConnectedRoom(page, "MQ");
    await mobileNav(page).getByRole("button", { name: "Queue", exact: true }).click();
    await expect(page.getByText("Queue is empty").first()).toBeVisible();
  });
});
