import { defineConfig, devices } from "@playwright/test";

const webServerEnv = {
  ...process.env,
  DATABASE_URL: "",
  YOUTUBE_API_KEY: "",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  TOGETHER_SKIP_ENV_FILE: "1",
  TOGETHER_E2E: "1",
  NEXT_PRIVATE_DISABLE_DEV_OVERLAY_UX: "1",
  ROOM_TOKEN_SECRET: "test-secret",
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3002",
  NEXT_PUBLIC_UMAMI_WEBSITE_ID: "playwright-umami-test",
  NEXT_PUBLIC_REALTIME_URL: "ws://127.0.0.1:8787",
};

const MOBILE_ONLY_SPECS = [
  "**/mobile-queue.spec.ts",
  "**/mobile-empty-states.spec.ts",
  "**/chat-mobile.spec.ts",
  "**/keyboard-shortcuts-mobile.spec.ts",
];

const MOBILE_E2E_SPECS = [
  ...MOBILE_ONLY_SPECS,
  "**/mobile-room.spec.ts",
  "**/join-private.spec.ts",
  "**/playback-two-clients.spec.ts",
  "**/skip-vote.spec.ts",
  "**/pwa-offline.spec.ts",
  "**/settings-in-room.spec.ts",
  "**/participants-moderation.spec.ts",
  "**/chat-bidi.spec.ts",
  "**/chat-mentions.spec.ts",
  "**/chat-ephemeral.spec.ts",
  "**/democratic-promote-flow.spec.ts",
  "**/history-tab.spec.ts",
  "**/smoke.spec.ts",
];

const visualProjects = [
  {
    name: "visual-desktop-chrome",
    testMatch: "**/visual-regression.spec.ts",
    use: { ...devices["Desktop Chrome"] },
  },
  {
    name: "visual-desktop-firefox",
    testMatch: "**/visual-regression.spec.ts",
    use: { ...devices["Desktop Firefox"] },
  },
  {
    name: "visual-desktop-safari",
    testMatch: "**/visual-regression.spec.ts",
    use: { ...devices["Desktop Safari"] },
  },
  {
    name: "visual-pixel-5",
    testMatch: "**/visual-regression.spec.ts",
    use: { ...devices["Pixel 5"] },
  },
  {
    name: "visual-iphone-13",
    testMatch: "**/visual-regression.spec.ts",
    use: { ...devices["iPhone 13"] },
  },
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }], ["github"]]
    : [["list"]],
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{projectName}/{arg}{ext}",
  use: {
    baseURL: "http://127.0.0.1:3002",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chrome",
      testMatch: MOBILE_E2E_SPECS,
      testIgnore: ["**/visual-regression.spec.ts", "**/keyboard-shortcuts.spec.ts"],
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "chromium",
      testIgnore: ["**/visual-regression.spec.ts", "**/mobile-room.spec.ts", ...MOBILE_ONLY_SPECS],
      use: { ...devices["Desktop Chrome"] },
    },
    ...visualProjects,
  ],
  webServer: [
    {
      command: "pnpm --filter @together/realtime dev --ip 127.0.0.1",
      url: "http://127.0.0.1:8787/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "pnpm exec next dev --port 3002",
      url: "http://127.0.0.1:3002",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: webServerEnv,
    },
  ],
});
