import { expect, type Page, test } from "@playwright/test";

const ROOM_PATH = "/r/umami-consent-test";
const TRACKER_PATH = "/w/a.js";
const RECORDER_PATH = "/w/a/r.js";
const SANITIZER_PATH = "/umami-recorder-sanitizer.js";
const CONSENT_KEY = "together.umami-consent";

async function visitWithAnalyticsPreference(
  page: Page,
  consent: "essential" | "basic" | "replay",
  expectTracker = true,
  path = ROOM_PATH,
) {
  const requestedScripts: string[] = [];
  await page
    .context()
    .addInitScript(({ consentKey, value }) => localStorage.setItem(consentKey, value), {
      consentKey: CONSENT_KEY,
      value: consent,
    });
  await page.route("**/w/a.js", async (route) => {
    requestedScripts.push(TRACKER_PATH);
    await route.fulfill({ contentType: "application/javascript", body: "" });
  });
  await page.route("**/w/a/r.js", async (route) => {
    requestedScripts.push(RECORDER_PATH);
    await route.fulfill({ contentType: "application/javascript", body: "" });
  });
  await page.route("**/umami-recorder-sanitizer.js", async (route) => {
    requestedScripts.push(SANITIZER_PATH);
    await route.fulfill({ contentType: "application/javascript", body: "" });
  });
  await page.goto(path);
  if (expectTracker) {
    await expect(page.locator(`#umami-analytics[src="${TRACKER_PATH}"]`)).toHaveCount(1);
  }
  return requestedScripts;
}

test.describe("Umami consent", () => {
  test("loads only the tracker for essential metrics", async ({ page }) => {
    await expect(await visitWithAnalyticsPreference(page, "essential")).toEqual([
      SANITIZER_PATH,
      TRACKER_PATH,
    ]);
    await expect(page.locator("#umami-analytics")).toHaveAttribute("data-exclude-search", "false");
  });

  test("loads no analytics scripts when Do Not Track is enabled", async ({ page }) => {
    await page.context().addInitScript(() => {
      Object.defineProperty(navigator, "doNotTrack", { configurable: true, value: "1" });
      Object.defineProperty(window, "doNotTrack", { configurable: true, value: "1" });
    });
    await expect(await visitWithAnalyticsPreference(page, "replay", false)).toEqual([]);
  });

  test("loads only the tracker for basic consent", async ({ page }) => {
    const requestedScripts = await visitWithAnalyticsPreference(page, "basic");
    await expect(page.locator(`#umami-recorder[src="${RECORDER_PATH}"]`)).toHaveCount(0);
    await expect(requestedScripts).toEqual([SANITIZER_PATH, TRACKER_PATH]);
  });

  test("presents a legacy basic preference as essential metrics", async ({ page }) => {
    await visitWithAnalyticsPreference(page, "basic");
    await page.getByRole("button", { name: "Analytics privacy" }).click();
    await expect(page.getByRole("radio", { name: /Essential metrics/ })).toBeChecked();
  });

  test("uses an opaque surface for analytics choices", async ({ page }) => {
    await visitWithAnalyticsPreference(page, "essential");
    const control = page.getByRole("button", { name: "Analytics privacy" });
    await expect(control).toHaveCSS("background-color", "rgb(26, 26, 36)");
    await control.click();
    await expect(page.getByRole("region", { name: "Analytics privacy choices" })).toHaveCSS(
      "background-color",
      "rgb(26, 26, 36)",
    );
  });

  test("loads tracker and recorder for replay consent on a room route", async ({ page }) => {
    const requestedScripts = await visitWithAnalyticsPreference(page, "replay");
    await expect(page.locator(`#umami-recorder[src="${RECORDER_PATH}"]`)).toHaveCount(1);
    await expect(page.locator("#together-umami-sanitizer")).toHaveAttribute(
      "referrerpolicy",
      "no-referrer",
    );
    await expect(page.locator("#umami-analytics")).toHaveAttribute("referrerpolicy", "no-referrer");
    await expect(page.locator("#umami-recorder")).toHaveAttribute("referrerpolicy", "no-referrer");
    await expect(requestedScripts).toEqual([SANITIZER_PATH, TRACKER_PATH, RECORDER_PATH]);
  });

  test("loads no Umami scripts on a credential-bearing URL", async ({ page }) => {
    for (const key of [
      "password",
      "token",
      "code",
      "state",
      "access_token",
      "refresh_token",
      "email",
    ]) {
      const requestedScripts = await visitWithAnalyticsPreference(
        page,
        "replay",
        false,
        `${ROOM_PATH}?${key}=secret`,
      );
      await page.getByRole("button", { name: "Analytics privacy" }).click();
      await page.waitForTimeout(100);
      await expect(requestedScripts).toEqual([]);
    }
  });
});
