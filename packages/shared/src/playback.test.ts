import { describe, expect, it } from "vitest";
import { getEffectivePlaybackPosition, sampleClockOffset, smoothClockOffset } from "./playback";

describe("playback", () => {
  it("getEffectivePlaybackPosition advances while playing", () => {
    const playback = {
      videoId: "abc",
      positionMs: 10_000,
      playing: true,
      playbackRate: 1,
      version: 1,
      updatedAt: 1_000_000,
    };
    expect(getEffectivePlaybackPosition(playback, 1_025_000, 0)).toBe(35_000);
    expect(getEffectivePlaybackPosition(playback, 1_025_000, -25_000)).toBe(10_000);
  });

  it("getEffectivePlaybackPosition pauses at position when not playing", () => {
    const playback = {
      videoId: "abc",
      positionMs: 5_000,
      playing: false,
      playbackRate: 1,
      version: 1,
      updatedAt: 1_000_000,
    };
    expect(getEffectivePlaybackPosition(playback, 9_000_000)).toBe(5_000);
  });

  it("smoothClockOffset averages samples", () => {
    expect(smoothClockOffset(0, 1000)).toBe(1000);
    expect(smoothClockOffset(1000, 2000)).toBe(1200);
  });

  it("sampleClockOffset returns server minus client", () => {
    expect(sampleClockOffset(5000, 4800)).toBe(200);
  });
});
