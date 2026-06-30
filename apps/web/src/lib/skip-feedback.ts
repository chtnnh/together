import type { HistoryItem } from "@together/shared";

/** Returns true when history grew and the newest entry was skipped. */
export function shouldToastTrackSkipped(
  history: HistoryItem[],
  previousLength: number,
): boolean {
  return history.length > previousLength && history[0]?.reason === "skipped";
}
