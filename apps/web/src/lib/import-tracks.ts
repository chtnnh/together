import { resolveTrackWithCache } from "@/lib/youtube";
import { shouldAutoQueue } from "@together/track-resolver";

export interface RawImportTrack {
  title: string;
  artist: string;
  durationMs: number;
  externalId: string;
  isrc?: string;
}

export async function resolveImportTracks(
  tracks: RawImportTrack[],
  source: "spotify" | "apple" | "manual",
) {
  const resolved = [];

  for (const track of tracks) {
    const result = await resolveTrackWithCache({
      source,
      title: track.title,
      artist: track.artist,
      durationMs: track.durationMs,
      isrc: track.isrc,
      externalId: track.externalId,
    });

    resolved.push({
      source,
      title: track.title,
      artist: track.artist,
      durationMs: track.durationMs,
      externalId: track.externalId,
      isrc: track.isrc,
      videoId: shouldAutoQueue(result.confidence) ? result.videoId : null,
      confidence: result.confidence,
      alternates: result.alternates,
    });
  }

  return resolved;
}
