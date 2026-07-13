import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Visible connection status (single instance in room header). */
export function connectionStatusLocator(page: Page) {
  return page.getByTestId("connection-status");
}

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
  await expect(connectionStatusLocator(page)).toContainText(/Connected/i, {
    timeout: 15000,
  });
}

/** Wait for ephemeral host toast to clear before visual snapshots. */
export async function waitForRoomUiStable(page: Page) {
  const hostToast = page.getByText("You are the host");
  try {
    await hostToast.waitFor({ state: "visible", timeout: 3000 });
    await hostToast.waitFor({ state: "hidden", timeout: 8000 });
  } catch {
    // Toast may not appear on every join — continue when absent or already dismissed.
  }
}
