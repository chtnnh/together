"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AdminStats {
  users: number;
  rooms: number;
  ownedRooms: number;
  playlists: number;
  playlistItems: number;
  liveRooms: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json() as Promise<AdminStats>;
      })
      .then(setStats)
      .catch(() => setError("Failed to load stats"));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Platform overview for saved rooms, playlists, and live sessions.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Users", stats.users],
            ["Rooms", stats.rooms],
            ["Saved rooms", stats.ownedRooms],
            ["Playlists", stats.playlists],
            ["Playlist items", stats.playlistItems],
            ["Live now", stats.liveRooms],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4"
            >
              <p className="text-sm text-[var(--text-muted)]">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/admin/rooms" className="text-sm text-[var(--accent)] hover:underline">
          Manage rooms
        </Link>
        <Link href="/admin/users" className="text-sm text-[var(--accent)] hover:underline">
          Manage users
        </Link>
        <Link href="/admin/abuse" className="text-sm text-[var(--accent)] hover:underline">
          Abuse queue
        </Link>
        <Link href="/admin/audit" className="text-sm text-[var(--accent)] hover:underline">
          Audit log
        </Link>
      </div>
    </div>
  );
}
