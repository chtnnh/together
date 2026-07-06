"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label } from "@together/ui";

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

interface ImportServices {
  spotify: boolean;
  soundcloud: boolean;
  apple: boolean;
}

interface ImportPlaylistDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (items: ImportedTrack[]) => void;
}

const TAB_LABELS: Record<ImportService, string> = {
  youtube: "YouTube",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  apple: "Apple Music",
};

const PLACEHOLDERS: Record<ImportService, string> = {
  youtube: "YouTube playlist or video URL",
  spotify: "https://open.spotify.com/playlist/…",
  soundcloud: "https://soundcloud.com/…/sets/…",
  apple: "https://music.apple.com/…/playlist/…",
};

const ENDPOINTS: Record<Exclude<ImportService, "youtube">, string> = {
  spotify: "/api/import/spotify",
  soundcloud: "/api/import/soundcloud",
  apple: "/api/import/apple",
};

export function ImportPlaylistDialog({ open, onClose, onImport }: ImportPlaylistDialogProps) {
  const [service, setService] = useState<ImportService>("youtube");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<ImportServices>({
    spotify: false,
    soundcloud: false,
    apple: false,
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    fetch("/api/import/services")
      .then((res) => res.json())
      .then((data: ImportServices) => setServices(data))
      .catch(() => {
        // Fall back to showing all tabs; errors surface on import.
      });
  }, [open]);

  if (!open) return null;

  const visibleTabs: ImportService[] = [
    "youtube",
    ...(services.spotify ? (["spotify"] as const) : []),
    ...(services.soundcloud ? (["soundcloud"] as const) : []),
    ...(services.apple ? (["apple"] as const) : []),
  ];

  const activeService = visibleTabs.includes(service) ? service : visibleTabs[0]!;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      let endpoint: string;
      let body: Record<string, string>;

      if (activeService === "youtube") {
        endpoint = "/api/import/youtube";
        body = { query: trimmed };
      } else {
        endpoint = ENDPOINTS[activeService];
        body = { url: trimmed };
      }

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

      const items = (Array.isArray(data) ? data : [data]) as ImportedTrack[];
      if (items.length === 0) {
        setError("No tracks found");
        return;
      }

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
          Paste a public playlist URL. Tracks resolve to YouTube where possible.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setService(tab);
                setError(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                activeService === tab
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <Label htmlFor="import-url">Playlist URL</Label>
          <Input
            id="import-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={PLACEHOLDERS[activeService]}
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
