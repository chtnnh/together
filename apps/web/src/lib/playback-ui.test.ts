import { describe, expect, it } from "vitest";
import { connectionStatusLabel } from "@/components/connection-status";
import { CROSSFADE_MS } from "@/lib/playback-crossfade";
import { VOLUME_NORMALIZATION_STRATEGY } from "@/lib/playback-volume-normalization";

describe("connection-status label", () => {
  it("shows Connected when online", () => {
    expect(
      connectionStatusLabel({
        offline: false,
        connected: true,
        synced: true,
        participantCount: 3,
        slug: "abc123",
      }),
    ).toMatch(/^Connected · 3 listening · abc123$/);
  });
});

describe("playback-crossfade", () => {
  it("uses a short crossfade between tracks", () => {
    expect(CROSSFADE_MS).toBeGreaterThanOrEqual(300);
    expect(CROSSFADE_MS).toBeLessThanOrEqual(500);
  });
});

describe("playback-volume-normalization", () => {
  it("uses re-apply strategy", () => {
    expect(VOLUME_NORMALIZATION_STRATEGY).toBe("reapply-user-volume-on-track-start");
  });
});
