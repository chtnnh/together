"use client";

import { useEffect, useState } from "react";

interface AuditEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorEmail: string | null;
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load audit log");
        const data = (await res.json()) as { entries: AuditEntry[] };
        return data.entries;
      })
      .then(setEntries)
      .catch(() => setError("Failed to load audit log"));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Audit log</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Recent superadmin actions on rooms and users.
        </p>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-secondary)] text-left">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">{entry.actorEmail ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{entry.action}</td>
                <td className="px-4 py-3">
                  {entry.targetType}
                  {entry.targetId ? `: ${entry.targetId}` : ""}
                </td>
              </tr>
            ))}
            {entries.length === 0 && !error && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--text-muted)]">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
