import type { PlaybackState } from "./schemas";

/** Current timeline position accounting for elapsed play time since last server update. */
export function getEffectivePlaybackPosition(
  playback: PlaybackState,
  now = Date.now(),
): number {
  if (!playback.playing) return playback.positionMs;
  return playback.positionMs + (now - playback.updatedAt) * playback.playbackRate;
}
