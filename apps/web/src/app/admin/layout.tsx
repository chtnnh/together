import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAuthedUser, isSuperadminUser } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthedUser();
  if (!user || !(await isSuperadminUser(user.id, user.email))) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)] px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Together Admin</h1>
            <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/rooms">Rooms</Link>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/abuse">Abuse</Link>
            <Link href="/admin/audit">Audit</Link>
            <Link href="/">Back to app</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
