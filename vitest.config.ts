import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/shared",
      "packages/ui",
      "packages/track-resolver",
      "packages/db",
      "services/realtime",
      "apps/web",
    ],
  },
});
