"use client";

import { Button } from "@together/ui";
import { AlertCircle } from "lucide-react";

interface PlaybackEmbedErrorBannerProps {
  message: string;
  canPickAlternate?: boolean;
  onPickAlternate?: () => void;
  onDismiss?: () => void;
}

export function PlaybackEmbedErrorBanner({
  message,
  canPickAlternate,
  onPickAlternate,
  onDismiss,
}: PlaybackEmbedErrorBannerProps) {
  return (
    <div
      className="absolute inset-x-0 top-0 z-30 flex items-start gap-2 border-b border-red-500/40 bg-red-950/90 px-3 py-2 text-sm text-red-100"
      role="alert"
      data-testid="playback-embed-error"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p>{message}</p>
        {canPickAlternate && onPickAlternate && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-2 h-7"
            onClick={onPickAlternate}
          >
            Pick alternate
          </Button>
        )}
      </div>
      {onDismiss && (
        <Button variant="ghost" size="sm" className="h-7 shrink-0" onClick={onDismiss}>
          Dismiss
        </Button>
      )}
    </div>
  );
}
