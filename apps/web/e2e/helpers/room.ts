import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Create a room from the landing page and wait for realtime connection. */
export async function createConnectedRoom(page: Page, displayName = "E2E") {
  await page.goto("/");
  await page.locator("#get-started").scrollIntoViewIfNeeded();
  const nameInput = page.locator("#create-name");
  await expect(nameInput).toBeVisible();
  await nameInput.click();
  await nameInput.fill(displayName);
  const createButton = page.getByRole("button", { name: "Create room" });
  await expect(createButton).toBeEnabled({ timeout: 15000 });
  await createButton.click();
  await page.waitForURL(/\/r\//);
  await expect(page.getByTestId("connection-status")).toContainText(/Connected/i, {
    timeout: 15000,
  });
}
