import { test, expect } from "@playwright/test";
import { parseSpotifyPlaylistUrl } from "../src/lib/spotify";
import {
  pickBestAvailableQuality,
  qualityPreferenceToYoutubeQuality,
} from "../src/lib/youtube-quality";

test.describe("parseSpotifyPlaylistUrl", () => {
  test("parses open.spotify.com playlist URLs", () => {
    expect(
      parseSpotifyPlaylistUrl("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"),
    ).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });

  test("parses spotify URI form", () => {
    expect(parseSpotifyPlaylistUrl("spotify:playlist:abc123")).toBe("abc123");
  });

  test("returns null for non-playlist URLs", () => {
    expect(parseSpotifyPlaylistUrl("https://open.spotify.com/track/xyz")).toBeNull();
  });
});

test.describe("youtube quality helpers", () => {
  test("maps explicit quality preferences", () => {
    expect(qualityPreferenceToYoutubeQuality("1080p")).toBe("hd1080");
    expect(qualityPreferenceToYoutubeQuality("auto")).toBeNull();
    expect(qualityPreferenceToYoutubeQuality("max")).toBeNull();
  });

  test("picks highest quality within cap for max mode", () => {
    const available = ["tiny", "medium", "hd720", "hd1080", "hd2160"];
    const picked = pickBestAvailableQuality(available, "max");
    expect(picked).toBe("hd1080");
  });
});
