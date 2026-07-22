import type { AnalyticsEngineDataset } from "@cloudflare/workers-types";

/** Aggregated realtime product events (Workers Analytics Engine). */
export type RealtimeAnalyticsEvent =
  | "room.joined"
  | "room.host_joined"
  | "track.added"
  | "track.skipped";

export function trackRealtimeEvent(
  dataset: AnalyticsEngineDataset | undefined,
  event: RealtimeAnalyticsEvent,
  opts?: { roomSlug?: string; label?: string; value?: number },
) {
  if (!dataset) return;

  dataset.writeDataPoint({
    blobs: [event, opts?.roomSlug ?? "", opts?.label ?? ""],
    doubles: [opts?.value ?? 1],
    indexes: [opts?.roomSlug ?? "global"],
  });
}
