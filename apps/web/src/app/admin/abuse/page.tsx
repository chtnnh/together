"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RoomBanSignal {
  id: string;
  roomSlug: string;
  roomTitle: string | null;
  userId: string | null;
  anonFingerprint: string | null;
  createdAt: string;
}

interface PasswordAttemptSignal {
  id: string;
  ipAddress: string;
  roomSlug: string;
  attempts: number;
  lockedUntil: string | null;
  updatedAt: string;
}

interface BannedUserSignal {
  id: string;
  email: string | null;
  bannedAt: string | null;
}

interface AbuseSignals {
  roomBans: RoomBanSignal[];
  passwordAttempts: PasswordAttemptSignal[];
  bannedUsers: BannedUserSignal[];
}

export default function AdminAbusePage() {
  const [signals, setSignals] = useState<AbuseSignals | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/abuse")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load abuse signals");
        return res.json() as Promise<AbuseSignals>;
      })
      .then(setSignals)
      .catch(() => setError("Failed to load abuse signals"));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Abuse queue</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Room bans, suspicious password attempts, and globally banned accounts.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {signals && (
        <>
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Recent room bans</h3>
            <SignalTable
              empty="No recent room bans."
              rows={signals.roomBans.map((ban) => ({
                key: ban.id,
                cells: [
                  new Date(ban.createdAt).toLocaleString(),
                  ban.roomSlug,
                  ban.userId ?? ban.anonFingerprint ?? "—",
                ],
              }))}
              headers={["When", "Room", "Banned identity"]}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Suspicious password attempts</h3>
            <SignalTable
              empty="No suspicious password attempts."
              rows={signals.passwordAttempts.map((row) => ({
                key: row.id,
                cells: [
                  row.roomSlug,
                  row.ipAddress,
                  String(row.attempts),
                  row.lockedUntil ? new Date(row.lockedUntil).toLocaleString() : "—",
                ],
              }))}
              headers={["Room", "IP", "Attempts", "Locked until"]}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Globally banned users</h3>
            <SignalTable
              empty="No globally banned users."
              rows={signals.bannedUsers.map((user) => ({
                key: user.id,
                cells: [
                  user.email ?? user.id,
                  user.bannedAt ? new Date(user.bannedAt).toLocaleString() : "—",
                ],
              }))}
              headers={["User", "Banned at"]}
            />
            <Link href="/admin/users" className="text-sm text-[var(--accent)] hover:underline">
              Manage users
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

function SignalTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: { key: string; cells: string[] }[];
  empty: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--bg-secondary)] text-left">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-[var(--border)]">
              {row.cells.map((cell, index) => (
                <td key={`${row.key}-${index}`} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-6 text-center text-[var(--text-muted)]">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
