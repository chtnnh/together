"use client";

import { Wifi, WifiOff, Loader2 } from "lucide-react";

interface ConnectionStatusProps {
  offline: boolean;
  connected: boolean;
  synced: boolean;
  participantCount: number;
  slug: string;
  /** Omit slug in tight headers (room page already shows the room name). */
  showSlug?: boolean;
  className?: string;
}

export function connectionStatusLabel({
  offline,
  connected,
  synced,
  participantCount,
  slug,
  showSlug = true,
}: ConnectionStatusProps): string {
  if (offline) return "Offline — start realtime server";
  if (connected) {
    const base = `Connected · ${participantCount} listening`;
    return showSlug ? `${base} · ${slug}` : base;
  }
  if (synced) return "Reconnecting…";
  return "Connecting…";
}

export function ConnectionStatus(props: ConnectionStatusProps) {
  const label = connectionStatusLabel(props);
  const Icon = props.offline ? WifiOff : props.connected ? Wifi : Loader2;

  return (
    <p
      className={`flex items-center gap-1.5 text-xs text-[var(--text-muted)] ${props.className ?? ""}`}
      data-testid="connection-status"
      aria-live="polite"
    >
      <Icon
        className={`size-3.5 shrink-0 ${props.connected ? "text-emerald-400" : ""} ${!props.connected && !props.offline ? "animate-spin" : ""}`}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </p>
  );
}
