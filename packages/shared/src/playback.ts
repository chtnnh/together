import type { PlaybackState } from "./schemas";

/** Current timeline position accounting for elapsed play time since last server update. */
export function getEffectivePlaybackPosition(
  playback: PlaybackState,
  now = Date.now(),
  clockOffsetMs = 0,
): number {
  if (!playback.playing) return playback.positionMs;
  const serverNow = now + clockOffsetMs;
  return playback.positionMs + (serverNow - playback.updatedAt) * playback.playbackRate;
}

/** Estimate client clock offset from a server timestamp (positive = client is behind). */
export function sampleClockOffset(serverAt: number, clientNow = Date.now()): number {
  return serverAt - clientNow;
}

/** Smooth clock offset samples to reduce jitter from network latency. */
export function smoothClockOffset(current: number, sample: number): number {
  if (current === 0) return sample;
  return Math.round(current * 0.8 + sample * 0.2);
}
