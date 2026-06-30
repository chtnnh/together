import { test, expect } from "@playwright/test";
import { CROSSFADE_MS } from "../src/lib/playback-crossfade";

test.describe("Phase 4.4 — Crossfade", () => {
  test("uses a short crossfade between tracks", () => {
    expect(CROSSFADE_MS).toBeGreaterThanOrEqual(300);
    expect(CROSSFADE_MS).toBeLessThanOrEqual(500);
  });
});
