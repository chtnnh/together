import { describe, expect, it } from "vitest";
import { parseSpotifyPlaylistUrl } from "./spotify";
import { pickBestAvailableQuality, qualityPreferenceToYoutubeQuality } from "./youtube-quality";

describe("spotify", () => {
  it("parses open.spotify.com playlist URLs", () => {
    expect(
      parseSpotifyPlaylistUrl("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"),
    ).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });
});

describe("youtube-quality", () => {
  it("maps explicit quality preferences", () => {
    expect(qualityPreferenceToYoutubeQuality("1080p")).toBe("hd1080");
    expect(qualityPreferenceToYoutubeQuality("auto")).toBeNull();
  });

  it("picks highest quality within cap for max mode", () => {
    const available = ["tiny", "medium", "hd720", "hd1080", "hd2160"];
    expect(pickBestAvailableQuality(available, "max")).toBe("hd1080");
  });
});
