import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3002",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @together/realtime dev --ip 127.0.0.1",
      url: "http://127.0.0.1:8787/health",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: "pnpm exec next dev --port 3002",
      url: "http://127.0.0.1:3002",
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        ...process.env,
        DATABASE_URL: "",
        YOUTUBE_API_KEY: "",
        TOGETHER_SKIP_ENV_FILE: "1",
        TOGETHER_E2E: "1",
        ROOM_TOKEN_SECRET: "test-secret",
        NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3002",
        NEXT_PUBLIC_REALTIME_URL: "ws://127.0.0.1:8787",
      },
    },
  ],
});
