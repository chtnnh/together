"use client";

import { useEffect, useState } from "react";
import { Button } from "@together/ui";
import Link from "next/link";

interface Playlist {
  id: string;
  name: string;
  source: string;
  importedAt: string;
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/playlists")
      .then(async (r) => {
        if (r.status === 401) {
          setError("Sign in to view saved playlists");
          return [];
        }
        return r.json();
      })
      .then((data) => {
        setPlaylists(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load playlists");
        setLoading(false);
      });
  }, []);

  const handleRequeue = async (id: string) => {
    const res = await fetch(`/api/playlists/${id}`);
    const playlist = await res.json();
    sessionStorage.setItem("together_import_items", JSON.stringify(
      playlist.items.map((item: { resolvedYoutubeId: string; title: string; artist?: string; source: string; confidence?: number }) => ({
        source: item.source ?? "youtube",
        videoId: item.resolvedYoutubeId,
        title: item.title,
        artist: item.artist,
        confidence: item.confidence ?? 100,
      })),
    ));
    window.location.href = "/";
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Saved Playlists</h1>
        <Link href="/settings">
          <Button variant="secondary" size="sm">Account</Button>
        </Link>
      </div>

      {loading && <p className="text-[var(--text-muted)]">Loading...</p>}
      {error && (
        <div className="rounded-lg border border-[var(--border)] p-6 text-center">
          <p className="mb-4 text-[var(--text-muted)]">{error}</p>
          <Link href="/settings">
            <Button>Sign in</Button>
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {playlists.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-[var(--text-muted)]">
                {p.source} · {new Date(p.importedAt).toLocaleDateString()}
              </p>
            </div>
            <Button size="sm" onClick={() => handleRequeue(p.id)}>
              Re-queue
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
