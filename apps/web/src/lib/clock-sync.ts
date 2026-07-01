import { sampleClockOffset, smoothClockOffset } from "@together/shared";

export function applyServerTimestamp(
  currentOffsetMs: number,
  serverNow: number,
  clientNow = Date.now(),
): number {
  return smoothClockOffset(currentOffsetMs, sampleClockOffset(serverNow, clientNow));
}
