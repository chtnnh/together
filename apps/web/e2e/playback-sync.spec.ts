import { test, expect } from "@playwright/test";
import {
  getEffectivePlaybackPosition,
  smoothClockOffset,
} from "@together/shared";

test.describe("Playback sync", () => {
  test("clock offset corrects position when client clock is ahead of server", () => {
    const playback = {
      videoId: "abc",
      positionMs: 10_000,
      playing: true,
      playbackRate: 1,
      version: 1,
      updatedAt: 1_000_000,
    };
    const clientNow = 1_025_000;
    const offsetMs = -25_000;

    expect(getEffectivePlaybackPosition(playback, clientNow, 0)).toBe(35_000);
    expect(getEffectivePlaybackPosition(playback, clientNow, offsetMs)).toBe(10_000);
  });

  test("smoothClockOffset averages samples", () => {
    expect(smoothClockOffset(0, 1000)).toBe(1000);
    expect(smoothClockOffset(1000, 2000)).toBe(1200);
  });
});
