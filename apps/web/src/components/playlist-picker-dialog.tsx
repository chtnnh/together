"use client";

import { useEffect, useState } from "react";
import { Button } from "@together/ui";

interface PlaylistSummary {
  id: string;
  name: string;
  source: string;
}

interface PlaylistPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onLoad: (items: Array<{
    source: string;
    videoId: string | null;
    title: string;
    artist?: string;
    durationMs?: number;
    confidence?: number;
    alternates?: unknown;
  }>) => void;
}

export function PlaylistPickerDialog({ open, onClose, onLoad }: PlaylistPickerDialogProps) {
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch("/api/playlists")
      .then(async (res) => {
        if (res.status === 401) {
          setError("Sign in to load saved playlists");
          return [];
        }
        return res.json();
      })
      .then((data) => {
        setPlaylists(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Failed to load playlists"))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const handleSelect = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/playlists/${id}`);
      const playlist = await res.json();
      if (!res.ok) {
        setError(playlist.error ?? "Failed to load playlist");
        return;
      }
      const items = (playlist.items ?? []).map(
        (item: {
          source: string;
          resolvedYoutubeId?: string | null;
          title: string;
          artist?: string;
          durationMs?: number;
          confidence?: number;
          alternates?: unknown;
        }) => ({
          source: item.source,
          videoId: item.resolvedYoutubeId ?? null,
          title: item.title,
          artist: item.artist,
          durationMs: item.durationMs,
          confidence: item.confidence,
          alternates: item.alternates,
        }),
      );
      onLoad(items);
      onClose();
    } catch {
      setError("Failed to load playlist");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(80vh,28rem)] w-full max-w-md flex-col rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-xl"
        role="dialog"
        aria-labelledby="playlist-picker-title"
      >
        <div className="border-b border-[var(--border)] p-4">
          <h2 id="playlist-picker-title" className="text-lg font-semibold">
            Load saved playlist
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Tracks are added to requests or queue per room settings.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading && <p className="p-3 text-sm text-[var(--text-muted)]">Loading…</p>}
          {error && <p className="p-3 text-sm text-red-400">{error}</p>}
          {!loading && !error && playlists.length === 0 && (
            <p className="p-3 text-sm text-[var(--text-muted)]">No saved playlists yet.</p>
          )}
          <ul className="space-y-1">
            {playlists.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={loadingId !== null}
                  onClick={() => handleSelect(p.id)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--bg-secondary)] disabled:opacity-50"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {loadingId === p.id ? "Loading…" : p.source}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-[var(--border)] p-3">
          <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
