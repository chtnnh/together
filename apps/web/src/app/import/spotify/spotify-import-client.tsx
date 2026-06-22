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

  useEffect(() => {
    fetch("/api/import/spotify")
      .then((r) => r.json())
      .then((data) => {
        setPlaylists(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleImport = async (playlistId: string) => {
    setImporting(playlistId);
    try {
      const res = await fetch("/api/import/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });
      const items = await res.json();

      sessionStorage.setItem("together_import_items", JSON.stringify(items));
      router.push(room ? `/r/${room}` : "/");
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
