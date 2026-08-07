import { describe, expect, it } from "vitest";
import {
  buildSearchQuery,
  parseDuration,
  parseYouTubePlaylistId,
  parseYouTubeVideoId,
  scoreCandidate,
  shouldAutoQueue,
} from "./index";

describe("track-resolver", () => {
  it("parseYouTubeVideoId handles watch URLs", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parseYouTubePlaylistId extracts list id", () => {
    expect(parseYouTubePlaylistId("https://youtube.com/watch?v=x&list=PLabc")).toBe("PLabc");
  });

  it("parseDuration converts ISO 8601", () => {
    expect(parseDuration("PT3M30S")).toBe(210_000);
  });

  it("buildSearchQuery prefers ISRC", () => {
    expect(buildSearchQuery({ title: "Song", source: "spotify", isrc: "USRC123" })).toBe("USRC123");
  });

  it("scoreCandidate boosts title match", () => {
    const score = scoreCandidate(
      { title: "Never Gonna Give You Up", source: "manual" },
      {
        videoId: "x",
        title: "Never Gonna Give You Up (Official Video)",
        channelTitle: "Rick Astley",
      },
    );
    expect(score).toBeGreaterThan(70);
  });

  it("shouldAutoQueue at high confidence", () => {
    expect(shouldAutoQueue(90)).toBe(true);
    expect(shouldAutoQueue(50)).toBe(false);
  });
});
