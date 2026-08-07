import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Desktop sidebar (hidden on mobile viewports). */
export function roomSidebar(page: Page) {
  return page.locator(".hidden.w-96.min-h-0.flex-col.border-l.md\\:flex");
}

/** Add URL input visible in the current viewport (sidebar on desktop, footer on mobile). */
export function addUrlInput(page: Page) {
  return page.getByPlaceholder(/Paste a video\/playlist link/i).filter({ visible: true });
}

/** Promote vote bar in the active viewport (sidebar + mobile panel can both exist in DOM). */
export function promoteVoteBar(page: Page) {
  return page.getByTestId("promote-vote-bar").filter({ visible: true });
}

/** Wait for a guest request to surface the promote bar (WS sync can lag under load). */
export async function expectPromoteVoteBarVisible(page: Page) {
  await expect(async () => {
    await openRoomTab(page, "Requests");
    await expect(
      promoteVoteBar(page).getByRole("button", { name: "Vote to promote" }),
    ).toBeVisible();
  }).toPass({ timeout: 30000 });
}

/** Visible connection status (single instance in room header). */
export function connectionStatusLocator(page: Page) {
  return page.getByTestId("connection-status");
}

/** Mobile bottom nav (hidden on desktop). */
export function mobileNav(page: Page) {
  return page.getByTestId("mobile-nav");
}

type RoomTab = "Requests" | "Queue" | "History" | "Chat";

/** Open a room sidebar tab (desktop) or bottom nav tab (mobile). */
export async function openRoomTab(page: Page, tab: RoomTab) {
  const nav = mobileNav(page);
  if (await nav.isVisible()) {
    const button = nav.getByRole("button", { name: tab, exact: true });
    const isActive = await button.evaluate((el) => el.className.includes("text-[var(--accent)]"));
    if (!isActive) {
      // Dev overlay can intercept nav taps under parallel CI load.
      await button.click({ force: true });
    }
  } else {
    const desktopTab = page.getByRole("tab", { name: tab });
    if ((await desktopTab.getAttribute("data-state")) !== "active") {
      await desktopTab.click();
    }
  }
}

/** Open in-room settings (header button on desktop, overflow menu on mobile). */
export async function openRoomSettings(page: Page) {
  const settingsButton = page.getByRole("button", { name: "Settings", exact: true });
  if (await settingsButton.isVisible()) {
    await settingsButton.click();
    return;
  }
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
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
