import { test, expect } from "@playwright/test";
import { shouldToastTrackSkipped } from "../src/lib/skip-feedback";

test.describe("Phase 3.6 — Skip vote feedback", () => {
  test("shouldToastTrackSkipped when newest history entry was skipped", () => {
    const history = [
      {
        id: "1",
        source: "youtube" as const,
        videoId: "abc",
        title: "Track",
        addedBy: "DJ",
        addedById: "p1",
        finishedAt: Date.now(),
        reason: "skipped" as const,
      },
    ];
    expect(shouldToastTrackSkipped(history, 0)).toBe(true);
    expect(shouldToastTrackSkipped(history, 1)).toBe(false);
  });
});
