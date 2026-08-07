import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "track-resolver",
    include: ["src/**/*.test.ts"],
  },
});
