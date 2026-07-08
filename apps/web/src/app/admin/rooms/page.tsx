"use client";

import { useEffect, useState } from "react";
import { Button } from "@together/ui";

interface AdminRoom {
  id: string;
  slug: string;
  title: string | null;
  privacy: string;
  ownerUserId: string | null;
  createdAt: string;
  lastActiveAt: string | null;
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/rooms")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load rooms");
        const data = (await res.json()) as { rooms: AdminRoom[] };
        return data.rooms;
      })
      .then(setRooms)
      .catch(() => setError("Failed to load rooms"));
  };

  useEffect(() => {
    load();
  }, []);

  const handlePurge = async (slug: string) => {
    if (!confirm(`Purge live state for ${slug}? Connected users will be disconnected.`)) return;
    const res = await fetch(`/api/admin/rooms/${slug}/purge`, { method: "POST" });
    if (!res.ok) {
      setError("Failed to purge room");
      return;
    }
    load();
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete room ${slug}?`)) return;
    const res = await fetch(`/api/admin/rooms/${slug}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to delete room");
      return;
    }
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Rooms</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-secondary)] text-left">
            <tr>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Saved</th>
              <th className="px-4 py-3">Last active</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-mono">{room.slug}</td>
                <td className="px-4 py-3">{room.title ?? "—"}</td>
                <td className="px-4 py-3">{room.ownerUserId ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  {room.lastActiveAt
                    ? new Date(room.lastActiveAt).toLocaleString()
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handlePurge(room.slug)}>
                      Purge live
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(room.slug)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
