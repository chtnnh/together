"use client";

import { useState } from "react";
import { Button, Input, Label } from "@together/ui";
import type { QueueItem } from "@together/shared";

interface SavePlaylistDialogProps {
  open: boolean;
  queue: QueueItem[];
  onClose: () => void;
  onSaved: (name: string) => void;
}

function queueToPlaylistItems(queue: QueueItem[]) {
  return queue.map((item) => ({
    source: item.source,
    title: item.title,
    artist: item.artist,
    durationMs: item.durationMs,
    externalId: item.externalId,
    isrc: item.isrc,
    resolvedYoutubeId: item.videoId ?? undefined,
    confidence: item.confidence,
    alternates: item.alternates,
  }));
}

export function SavePlaylistDialog({
  open,
  queue,
  onClose,
  onSaved,
}: SavePlaylistDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || queue.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          source: "mixed",
          items: queueToPlaylistItems(queue),
        }),
      });
      const raw = await res.text();
      const data = raw ? (JSON.parse(raw) as { error?: string }) : {};
      if (!res.ok) {
        setError(data.error ?? "Failed to save playlist");
        return;
      }
      onSaved(trimmed);
      setName("");
      onClose();
    } catch {
      setError("Failed to save playlist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
        className="w-full max-w-sm space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-xl"
        role="dialog"
        aria-labelledby="save-playlist-title"
      >
        <h2 id="save-playlist-title" className="text-lg font-semibold">
          Save queue as playlist
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          {queue.length} track{queue.length === 1 ? "" : "s"} will be saved to your account.
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div>
          <Label htmlFor="playlist-name">Playlist name</Label>
          <Input
            id="playlist-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={128}
            required
            className="mt-1"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || queue.length === 0}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
