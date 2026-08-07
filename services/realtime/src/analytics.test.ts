import { describe, expect, it, vi } from "vitest";
import { trackRealtimeEvent } from "./analytics";
import { requiredVoteCount } from "./vote-math";

describe("analytics", () => {
  it("trackRealtimeEvent no-ops without dataset", () => {
    expect(() => trackRealtimeEvent(undefined, "room.joined")).not.toThrow();
  });

  it("trackRealtimeEvent writes to dataset", () => {
    const writeDataPoint = vi.fn();
    trackRealtimeEvent({ writeDataPoint } as never, "track.added", {
      roomSlug: "abc",
      label: "youtube",
    });
    expect(writeDataPoint).toHaveBeenCalledOnce();
  });
});

describe("vote-math", () => {
  it("requiredVoteCount uses ceiling of participants * threshold", () => {
    expect(requiredVoteCount(3, 0.51)).toBe(2);
    expect(requiredVoteCount(1, 0.51)).toBe(1);
    expect(requiredVoteCount(5, 0.5)).toBe(3);
  });
});
