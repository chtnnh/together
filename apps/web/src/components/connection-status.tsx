"use client";

import { Wifi, WifiOff, Loader2 } from "lucide-react";

interface ConnectionStatusProps {
  offline: boolean;
  connected: boolean;
  synced: boolean;
  participantCount: number;
  slug: string;
}

export function connectionStatusLabel({
  offline,
  connected,
  synced,
  participantCount,
  slug,
}: ConnectionStatusProps): string {
  if (offline) return "Offline — start realtime server";
  if (connected) return `Connected · ${participantCount} listening · ${slug}`;
  if (synced) return "Reconnecting…";
  return "Connecting…";
}

export function ConnectionStatus(props: ConnectionStatusProps) {
  const label = connectionStatusLabel(props);
  const Icon = props.offline ? WifiOff : props.connected ? Wifi : Loader2;

  return (
    <p
      className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]"
      data-testid="connection-status"
      aria-live="polite"
    >
      <Icon
        className={`size-3.5 shrink-0 ${props.connected ? "text-emerald-400" : ""} ${!props.connected && !props.offline ? "animate-spin" : ""}`}
        aria-hidden
      />
      <span>{label}</span>
    </p>
  );
}
