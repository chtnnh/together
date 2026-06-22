"use client";

import type { RequestItem } from "@together/shared";
import { Button, formatDuration } from "@together/ui";
import { X } from "lucide-react";

interface AlternatePickerProps {
  request: RequestItem;
  onPick: (videoId: string, title: string) => void;
  onClose: () => void;
}

export function AlternatePicker({ request, onPick, onClose }: AlternatePickerProps) {
  const alternates = request.alternates ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Pick a match</h3>
            <p className="text-sm text-[var(--text-muted)]">
              {request.title} · {request.confidence}% confidence
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-2">
          {alternates.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No alternates found</p>
          ) : (
            alternates.map((alt) => (
              <button
                key={alt.videoId}
                onClick={() => onPick(alt.videoId, alt.title)}
                className="flex w-full items-center gap-3 rounded-lg border border-[var(--border)] p-3 text-left hover:bg-[var(--bg-secondary)]"
              >
                {alt.thumbnailUrl && (
                  <img src={alt.thumbnailUrl} alt="" className="h-12 w-12 rounded object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{alt.title}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {alt.channelTitle}
                    {alt.durationMs ? ` · ${formatDuration(alt.durationMs)}` : ""}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
