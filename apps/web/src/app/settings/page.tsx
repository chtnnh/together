"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label } from "@together/ui";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!supabaseConfigured) return;
    try {
      const supabase = createSupabaseBrowserClient();
      supabase.auth.getUser().then(({ data }: { data: { user: { id: string; email?: string } | null } }) => {
        setUser(data.user);
        if (data.user?.email) setEmail(data.user.email);
      });
    } catch {
      // Handled by supabaseConfigured gate in UI.
    }
  }, [supabaseConfigured]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured) {
      setMessage(
        "Sign-in is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.",
      );
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const next = new URLSearchParams(window.location.search).get("next") ?? "/settings";
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      setMessage(error ? error.message : "Check your email for a sign-in link!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not reach Supabase";
      setMessage(
        msg.includes("fetch") || msg.includes("NetworkError")
          ? "Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and your network connection."
          : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabaseConfigured) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setMessage("Signed out");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Account</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">Home</Button>
        </Link>
      </div>

      {user ? (
        <div className="space-y-4 rounded-xl border border-[var(--border)] p-6">
          <p className="text-sm text-[var(--text-muted)]">
            Signed in as <span className="text-[var(--text)]">{user.email}</span>
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Your account lets you save playlists and persist room settings.
          </p>
          <Link href="/playlists">
            <Button variant="secondary" className="w-full">View playlists</Button>
          </Link>
          <Button variant="destructive" className="w-full" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      ) : !supabaseConfigured ? (
        <div className="space-y-4 rounded-xl border border-[var(--border)] p-6">
          <p className="text-sm text-[var(--text-muted)]">
            Sign-in requires Supabase. Add{" "}
            <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your root{" "}
            <code className="text-xs">.env</code>, then restart the dev server.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Anonymous use works without an account. Magic links are optional for saving playlists.
          </p>
        </div>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-4 rounded-xl border border-[var(--border)] p-6">
          <p className="text-sm text-[var(--text-muted)]">
            Optional account to save playlists and room settings. Anonymous use works without signing in.
          </p>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send magic link"}
          </Button>
        </form>
      )}

      {message && (
        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">{message}</p>
      )}
    </div>
  );
}
