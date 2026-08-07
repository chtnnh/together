import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "realtime",
    include: ["src/**/*.test.ts"],
  },
});
