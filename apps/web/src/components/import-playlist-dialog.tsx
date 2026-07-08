"use client";

import { useState } from "react";
import { Button, Input, Label } from "@together/ui";
import { importRequestForQuery } from "@/lib/import-url";
import { isImportPlaylist, normalizeImportResponse } from "@/lib/import-results";

export type ImportService = "youtube" | "spotify" | "soundcloud" | "apple";

export interface ImportedTrack {
  source: string;
  videoId: string | null;
  title: string;
  artist?: string;
  durationMs?: number;
  confidence?: number;
  alternates?: unknown;
}

interface ImportPlaylistDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (items: ImportedTrack[]) => void;
}

export function ImportPlaylistDialog({ open, onClose, onImport }: ImportPlaylistDialogProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const { endpoint, body } = importRequestForQuery(trimmed);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Import failed");
        return;
      }

      const results = normalizeImportResponse(data);
      if (results.length === 0) {
        setError("No tracks found");
        return;
      }

      const items = results.flatMap((result) =>
        isImportPlaylist(result) ? result.tracks : [result],
      ) as ImportedTrack[];

      onImport(items);
      setUrl("");
      onClose();
    } catch {
      setError("Import failed");
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
        onSubmit={handleImport}
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-xl"
        role="dialog"
        aria-labelledby="import-playlist-title"
      >
        <h2 id="import-playlist-title" className="text-lg font-semibold">
          Import playlist
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Paste a public playlist URL from YouTube, Spotify, SoundCloud, or Apple Music.
        </p>

        <div className="mt-4">
          <Label htmlFor="import-url">Playlist URL</Label>
          <Input
            id="import-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://open.spotify.com/playlist/…"
            className="mt-1"
            autoFocus
          />
        </div>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={loading || !url.trim()}>
            {loading ? "Importing…" : "Import"}
          </Button>
        </div>
      </form>
    </div>
  );
}
