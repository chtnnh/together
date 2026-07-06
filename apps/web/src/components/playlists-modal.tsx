"use client";

import { useEffect, useState } from "react";
import { Button } from "@together/ui";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import type { ImportedTrack } from "@/components/import-playlist-dialog";

interface PlaylistSummary {
  id: string;
  name: string;
  source: string;
}

interface PlaylistsModalProps {
  open: boolean;
  onClose: () => void;
  onLoad: (items: ImportedTrack[]) => void;
  onSignIn?: () => void;
}

export function PlaylistsModal({ open, onClose, onLoad, onSignIn }: PlaylistsModalProps) {
  const { signedIn, loading: authLoading } = useSupabaseUser();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (authLoading) return;
    if (!signedIn) {
      setPlaylists([]);
      setError("Sign in to view saved playlists");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetch("/api/playlists")
      .then(async (res) => {
        if (res.status === 401) {
          setError("Sign in to view saved playlists");
          return [];
        }
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => setPlaylists(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load playlists"))
      .finally(() => setLoading(false));
  }, [authLoading, open, signedIn]);

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
        aria-labelledby="playlists-modal-title"
      >
        <div className="border-b border-[var(--border)] p-4">
          <h2 id="playlists-modal-title" className="text-lg font-semibold">
            Saved playlists
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading && <p className="p-3 text-sm text-[var(--text-muted)]">Loading…</p>}
          {error && (
            <div className="p-3 text-center">
              <p className="text-sm text-[var(--text-muted)]">{error}</p>
              {onSignIn && !signedIn && (
                <Button className="mt-3" size="sm" onClick={onSignIn}>
                  Sign in
                </Button>
              )}
            </div>
          )}
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
