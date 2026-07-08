"use client";

import { useEffect, useState } from "react";
import { Button } from "@together/ui";
import Link from "next/link";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { SignInModal } from "@/components/sign-in-modal";
import { AccountNav } from "@/components/account-nav";

interface Playlist {
  id: string;
  name: string;
  source: string;
  importedAt: string;
}

export default function PlaylistsPage() {
  const { signedIn, loading: authLoading } = useSupabaseUser();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
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
      .then(async (r) => {
        if (r.status === 401) {
          setError("Sign in to view saved playlists");
          return [];
        }
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => {
        setPlaylists(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Failed to load playlists"))
      .finally(() => setLoading(false));
  }, [authLoading, signedIn]);

  const handleRequeue = async (id: string) => {
    const res = await fetch(`/api/playlists/${id}`);
    const playlist = await res.json();
    sessionStorage.setItem(
      "together_import_items",
      JSON.stringify(
        playlist.items.map(
          (item: {
            resolvedYoutubeId: string;
            title: string;
            artist?: string;
            source: string;
            confidence?: number;
          }) => ({
            source: item.source ?? "youtube",
            videoId: item.resolvedYoutubeId,
            title: item.title,
            artist: item.artist,
            confidence: item.confidence ?? 100,
          }),
        ),
      ),
    );
    window.location.href = "/";
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Saved Playlists</h1>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              Home
            </Button>
          </Link>
          <AccountNav
            signedIn={signedIn}
            authLoading={authLoading}
            onSignIn={() => setSignInOpen(true)}
            compact
            hidePlaylists
          />
        </div>
      </div>

      {loading && <p className="text-[var(--text-muted)]">Loading...</p>}
      {error && !loading && (
        <div className="rounded-lg border border-[var(--border)] p-6 text-center">
          <p className="mb-4 text-[var(--text-muted)]">{error}</p>
          <Button onClick={() => setSignInOpen(true)}>Sign in</Button>
        </div>
      )}

      {!error && !loading && playlists.length === 0 && (
        <p className="text-[var(--text-muted)]">No saved playlists yet.</p>
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

      <SignInModal
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        returnTo="/playlists"
      />
    </div>
  );
}
