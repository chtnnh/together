import { test, expect } from "@playwright/test";

test.describe("Phase 4.5 — Volume normalization", () => {
  test("uses re-apply strategy because YouTube iframe has no loudness API", async () => {
    const { VOLUME_NORMALIZATION_STRATEGY: strategy } = await import(
      "../src/lib/playback-volume-normalization"
    );
    expect(strategy).toBe("reapply-user-volume-on-track-start");
  });
});
