"use client";

import { useEffect, useState } from "react";
import { Button } from "@together/ui";
import { useSupabaseUser } from "@/hooks/use-supabase-user";

interface AdminUser {
  id: string;
  email: string | null;
  appRole: string;
  bannedAt: string | null;
  createdAt: string;
  ownedRoomCount: number;
  playlistCount: number;
}

export default function AdminUsersPage() {
  const { userId } = useSupabaseUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/users")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load users");
        const data = (await res.json()) as { users: AdminUser[] };
        return data.users;
      })
      .then(setUsers)
      .catch(() => setError("Failed to load users"));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleBan = async (user: AdminUser) => {
    if (user.id === userId) return;
    const banned = !user.bannedAt;
    const res = await fetch(`/api/admin/users/${user.id}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to update user");
      return;
    }
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Users</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-secondary)] text-left">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Rooms</th>
              <th className="px-4 py-3">Playlists</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === userId;
              return (
                <tr key={user.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">{user.email ?? user.id}</td>
                  <td className="px-4 py-3">{user.appRole}</td>
                  <td className="px-4 py-3 tabular-nums">{user.ownedRoomCount}</td>
                  <td className="px-4 py-3 tabular-nums">{user.playlistCount}</td>
                  <td className="px-4 py-3">{user.bannedAt ? "Banned" : "Active"}</td>
                  <td className="px-4 py-3">
                    {isSelf ? (
                      <span className="text-xs text-[var(--text-muted)]">You</span>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => toggleBan(user)}>
                        {user.bannedAt ? "Unban" : "Ban"}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
