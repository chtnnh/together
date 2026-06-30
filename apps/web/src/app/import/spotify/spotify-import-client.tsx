"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@together/ui";

interface Playlist {
  id: string;
  name: string;
  trackCount: number;
}

export default function SpotifyImportClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room") ?? "";
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/import/spotify")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "Failed to load Spotify playlists",
          );
        }
        return data;
      })
      .then((data) => {
        setPlaylists(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load Spotify playlists");
        setLoading(false);
      });
  }, []);

  const handleImport = async (playlistId: string) => {
    setImporting(playlistId);
    setError(null);
    try {
      const res = await fetch("/api/import/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });
      const items = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof items.error === "string" ? items.error : "Spotify import failed",
        );
      }

      sessionStorage.setItem("together_import_items", JSON.stringify(items));
      router.push(room ? `/r/${room}` : "/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Spotify import failed");
    } finally {
      setImporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading Spotify playlists...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Import from Spotify</h1>
      {error && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="space-y-2">
        {playlists.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-[var(--text-muted)]">{p.trackCount} tracks</p>
            </div>
            <Button
              size="sm"
              onClick={() => handleImport(p.id)}
              disabled={importing === p.id}
            >
              {importing === p.id ? "Importing..." : "Import"}
            </Button>
          </div>
        ))}
        {playlists.length === 0 && (
          <p className="text-[var(--text-muted)]">No playlists found or Spotify not configured.</p>
        )}
      </div>
    </div>
  );
}
